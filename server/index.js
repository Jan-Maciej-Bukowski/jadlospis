const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
//const helmet = require("helmet"); eslint mówi że nigdy nie używany :/
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const User = require("./models/User");
const PublicMenu = require("./models/PublicMenu");
const PublicDish = require("./models/PublicDish");
const auth = require("./middleware/auth");

// Google OAuth (passport)
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const crypto = require("crypto");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  `${process.env.APP_URL || "http://localhost:4000"}/auth/google/callback`;

// --- moved up so app and JWT_SECRET exist before using passport ---
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const app = express();
// --- end moved ---

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      // verify callback
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = (profile.emails && profile.emails[0]?.value) || null;
          const displayName =
            profile.displayName ||
            (email && email.split("@")[0]) ||
            "google-user";

          // helper: rozpoznaj lokalny upload vs URL Google
          // eslint-disable-next-line unused-imports/no-unused-vars
          const isLocalAvatar = (a) =>
            typeof a === "string" && a.startsWith("/uploads/");
          const isGoogleAvatar = (a) =>
            typeof a === "string" &&
            a.startsWith("http") &&
            a.includes("googleusercontent.com");

          // find by email OR previously saved google id
          const search = [];
          if (email) search.push({ email });
          search.push({ "oauth.googleId": profile.id });
          let user = await User.findOne({ $or: search });

          if (!user) {
            // create user with google id stored under oauth.googleId
            const random = crypto.randomBytes(20).toString("hex");
            const hash = await bcrypt.hash(random, 12);
            user = await User.create({
              email: email || `google+${profile.id}@noemail.local`,
              username:
                displayName.replace(/\s+/g, "").substring(0, 30) ||
                `g${profile.id}`,
              passwordHash: hash,
              avatar:
                profile.photos && profile.photos[0]?.value
                  ? profile.photos[0].value
                  : null,
              oauth: { googleId: profile.id },
              data: {
                dishes: [],
                dishLists: [],
                lastMenu: null,
                savedMenus: [],
                settings: {},
              },
            });
          } else {
            // ensure googleId is recorded for later direct match
            const photo = profile.photos && profile.photos[0]?.value;
            if (!user.oauth || user.oauth.googleId !== profile.id) {
              user.oauth = user.oauth || {};
              user.oauth.googleId = profile.id;
              // only set Google avatar if user has no avatar or current avatar is also a Google URL
              if (photo && (!user.avatar || isGoogleAvatar(user.avatar))) {
                user.avatar = photo;
              }
              await user.save();
            } else if (photo) {
              // update Google avatar only when current avatar is empty or already from Google
              if (!user.avatar || isGoogleAvatar(user.avatar)) {
                if (user.avatar !== photo) {
                  user.avatar = photo;
                  await user.save();
                }
              }
            }
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  // no sessions
  app.use(passport.initialize());
  // auth routes
  app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
    })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: `${FRONTEND_URL}/?oauth=fail`,
    }),
    async (req, res) => {
      try {
        const user = req.user;
        // create JWT
        const token = jwt.sign(
          { id: user._id, username: user.username, email: user.email },
          JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );
        // redirect to frontend with token in query (frontend will finish setup)
        const redirectTo = `${FRONTEND_URL.replace(
          /\/+$/,
          ""
        )}/?token=${encodeURIComponent(token)}`;
        return res.redirect(redirectTo);
      } catch (e) {
        console.error("OAuth callback error:", e);
        return res.redirect(`${FRONTEND_URL}/?oauth=error`);
      }
    }
  );
} else {
  console.warn("Google OAuth not configured: GOOGLE_CLIENT_ID/SECRET missing");
}

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGODB_URI is not set.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// dozwolone originy (dodaj tu localhost podczas developmentu)
const allowedOrigins = [
  "https://jadlospis-agvr.onrender.com",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (e.g. curl, mobile apps)
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// opcjonalnie: globalny handler preflight
app.options(
  "*",
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Too many requests" },
});

app.get("/", (req, res) =>
  res.send("Auth server running. Use /api/register /api/login")
);

// register - tworzymy usera z pustą strukturą data
app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password)
      return res
        .status(400)
        .json({ error: "email, username i password są wymagane" });
    const exists = await User.findOne({
      $or: [{ email }, { username }],
    }).lean();
    if (exists)
      return res
        .status(400)
        .json({ error: "Email lub nazwa użytkownika zajęta" });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      username,
      passwordHash: hash,
      data: {
        dishes: [],
        dishLists: [],
        lastMenu: null,
        savedMenus: [],
        settings: {},
      },
    });
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar || null,
      },
      userData: user.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// login - zwracamy także user.data
app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body || {};
    if (!emailOrUsername || !password)
      return res
        .status(400)
        .json({ error: "emailOrUsername i password są wymagane" });
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
    if (!user)
      return res.status(400).json({ error: "Nie znaleziono użytkownika" });
    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "Nieprawidłowe hasło" });
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar || null,
      },
      userData: user.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET user data (chronione)
app.get("/api/user/data", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });
    res.json({ data: user.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT user data (chronione) - zamienia całe data lub merge jeśli przesłano merge=true
app.put("/api/user/data", auth, async (req, res) => {
  try {
    const payload = req.body || {};
    const merge = !!payload.merge;
    const newData = payload.data || {};
    console.log("PUT /api/user/data from user:", req.user?.id, "merge:", merge);
    // debug pełnego payloadu (ogranicz do 10k znaków)
    try {
      const dump = JSON.stringify(newData);
      console.log(
        "incoming payload (truncated):",
        dump.length > 10000 ? dump.slice(0, 10000) + "...(truncated)" : dump
      );
    } catch (e) {
      console.log("incoming payload: (could not stringify)", e);
    }

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });

    if (merge) {
      for (const k of Object.keys(newData)) {
        const incoming = newData[k];
        const existing = user.data?.[k];
        // jeśli oba są zwykłymi obiektami (nie tablicami), wykonaj płytkie scalanie pól
        if (
          existing &&
          incoming &&
          typeof existing === "object" &&
          !Array.isArray(existing) &&
          typeof incoming === "object" &&
          !Array.isArray(incoming)
        ) {
          user.data[k] = { ...existing, ...incoming };
        } else {
          // w pozostałych przypadkach nadpisz (np. tablice, null, prymitywy)
          user.data[k] = incoming;
        }
      }
    } else {
      user.data = newData;
    }

    await user.save();

    // odczytaj świeże dane z DB i zaloguj je (krótko)
    const fresh = await User.findById(req.user.id).lean();
    console.log("user.data after save (summary):", {
      dishes: Array.isArray(fresh.data?.dishes)
        ? fresh.data.dishes.length
        : typeof fresh.data?.dishes,
      dishLists: Array.isArray(fresh.data?.dishLists)
        ? fresh.data.dishLists.length
        : typeof fresh.data?.dishLists,
      lastMenu: fresh.data?.lastMenu ? true : false,
      savedMenus: Array.isArray(fresh.data?.savedMenus)
        ? fresh.data.savedMenus.length
        : typeof fresh.data?.savedMenus,
      settingsKeys: fresh.data?.settings
        ? Object.keys(fresh.data.settings).length
        : 0,
    });

    res.json({ data: fresh.data });
  } catch (err) {
    console.error("PUT /api/user/data error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE account (chronione)
app.delete("/api/user", auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/user - update email / username
app.patch("/api/user", auth, async (req, res) => {
  try {
    const { email, username } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });

    if (email && email !== user.email) {
      const exists = await User.findOne({ email }).lean();
      if (exists) return res.status(400).json({ error: "Email zajęty" });
      user.email = email;
    }
    if (username && username !== user.username) {
      const exists = await User.findOne({ username }).lean();
      if (exists)
        return res.status(400).json({ error: "Nazwa użytkownika zajęta" });
      user.username = username;
    }

    await user.save();
    res.json({
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error("PATCH /api/user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/user/password - change password (requires currentPassword)
app.post("/api/user/password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({ error: "currentPassword i newPassword są wymagane" });

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash || "");
    if (!ok)
      return res.status(401).json({ error: "Nieprawidłowe aktualne hasło" });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/user/password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// serve uploads publicly
app.use("/uploads", express.static(uploadsDir));

// multer config: images only, max 2MB
// eslint-disable-next-line unused-imports/no-unused-vars
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const name =
      Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext;
    cb(null, name);
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "uploads"));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Tylko pliki graficzne"));
    }
  },
});

// upload avatar (multipart/form-data). stores file in /uploads and saves path in DB (only path).
app.post("/api/user/avatar", auth, (req, res) => {
  upload.single("avatar")(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(413).json({ error: "Plik za duży" });
        return res.status(400).json({ error: err.message || "Upload error" });
      }

      const file = req.file;
      console.log("avatar upload file:", file); // debug
      if (!file) return res.status(400).json({ error: "Brak pliku" });

      // find user (auth middleware setuje req.user.id)
      const user = await User.findById(req.user.id);
      if (!user)
        return res.status(404).json({ error: "Użytkownik nie istnieje" });

      const storedPath = `/uploads/${file.filename}`;
      // remove previous avatar file if present (optional cleanup)
      try {
        const prev = user.avatar || user.data?.settings?.avatar;
        if (prev && prev.startsWith("/uploads/")) {
          const prevFile = path.join(__dirname, prev);
          if (fs.existsSync(prevFile)) fs.unlinkSync(prevFile);
        }
      } catch (e) {
        /* ignore cleanup errors */
        console.warn("Could not remove previous avatar:", e);
      }

      user.avatar = storedPath;
      await user.save();

      console.log(
        "Saved avatar for user",
        user._id.toString(),
        "->",
        storedPath
      );

      // build public URL: prefer explicit APP_URL (set this in Render), fallback to request host
      const baseUrl =
        process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const fullUrl = `${baseUrl}${storedPath}`;

      return res.json({ path: storedPath, url: fullUrl, avatar: storedPath });
    } catch (e) {
      console.error("POST /api/user/avatar error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });
});

// --- PUBLIC image upload endpoint (returns path + full url) ---
app.post("/api/uploads/image", (req, res) => {
  upload.single("image")(req, res, (err) => {
    try {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(413).json({ error: "Plik za duży" });
        return res.status(400).json({ error: err.message || "Upload error" });
      }
      const file = req.file;
      if (!file) return res.status(400).json({ error: "Brak pliku" });
      const storedPath = `/uploads/${file.filename}`;
      const baseUrl =
        process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const fullUrl = `${baseUrl}${storedPath}`;
      return res.json({ path: storedPath, url: fullUrl });
    } catch (e) {
      console.error("Public upload error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });
});

// static files: /uploads dostępny publicznie
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// publikuj zapisany jadłospis (chronione)
app.post("/api/public/menus", auth, async (req, res) => {
  try {
    const { title, menu, tags, dishes } = req.body || {};
    if (!title || !menu)
      return res.status(400).json({ error: "title i menu są wymagane" });

    const pm = await PublicMenu.create({
      title,
      menu,
      // save optional full dishes metadata if provided
      dishes: Array.isArray(dishes) ? dishes : [],
      author: { id: req.user.id, username: req.user.username },
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json({ id: pm._id, createdAt: pm.createdAt });
  } catch (err) {
    console.error("POST /api/public/menus error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// lista publicznych jadlospisow (public, paginacja)
app.get("/api/public/menus", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      50,
      Math.max(5, parseInt(req.query.limit || "12", 10))
    );
    const skip = (page - 1) * limit;

    const filter = { public: true };
    if (q) filter.title = { $regex: q, $options: "i" };

    const total = await PublicMenu.countDocuments(filter);
    const items = await PublicMenu.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ total, page, limit, items });
  } catch (err) {
    console.error("GET /api/public/menus error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// pobierz pojedynczy publiczny jadłospis
app.get("/api/public/menus/:id", async (req, res) => {
  try {
    const pm = await PublicMenu.findById(req.params.id).lean();
    if (!pm) return res.status(404).json({ error: "Not found" });
    res.json(pm);
  } catch (err) {
    console.error("GET /api/public/menus/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// usuń własny opublikowany jadłospis
app.delete("/api/public/menus/:id", auth, async (req, res) => {
  try {
    const pm = await PublicMenu.findById(req.params.id);
    if (!pm) return res.status(404).json({ error: "Not found" });
    if (!pm.author?.id || pm.author.id.toString() !== req.user.id)
      return res.status(403).json({ error: "No permission" });
    await pm.remove();
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/public/menus/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// publikuj potrawę (chronione) - zapisuje pełne metadane potrawy
app.post("/api/public/dishes", auth, async (req, res) => {
  try {
    const dish = req.body || {};
    if (!dish.name) return res.status(400).json({ error: "name is required" });

    const pd = await PublicDish.create({
      name: dish.name,
      tags: Array.isArray(dish.tags) ? dish.tags : dish.tags ? [dish.tags] : [],
      params: dish.params || "",
      ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
      maxRepeats: dish.maxRepeats ?? 1,
      allowedMeals: Array.isArray(dish.allowedMeals)
        ? dish.allowedMeals
        : dish.allowedMeals
        ? [dish.allowedMeals]
        : ["śniadanie", "obiad", "kolacja"],
      rating: dish.rating ?? 0,
      favorite: !!dish.favorite,
      avatar: dish.avatar || "",
      maxAcrossWeeks: dish.maxAcrossWeeks ?? null,
      allowedDays: Array.isArray(dish.allowedDays) ? dish.allowedDays : [],
      author: { id: req.user.id, username: req.user.username },
      public: true,
    });

    res.status(201).json({ id: pd._id, createdAt: pd.createdAt });
  } catch (err) {
    console.error("POST /api/public/dishes error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
});

// lista publicznych potraw (public, proste filtrowanie/paginacja)
app.get("/api/public/dishes", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      100,
      Math.max(10, parseInt(req.query.limit || "50", 10))
    );
    const skip = (page - 1) * limit;

    const filter = { public: true };
    if (q) filter.name = { $regex: q, $options: "i" };

    const total = await PublicDish.countDocuments(filter);
    const items = await PublicDish.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({ total, page, limit, items });
  } catch (err) {
    console.error("GET /api/public/dishes error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// pobierz pojedynczą publiczną potrawę
app.get("/api/public/dishes/:id", async (req, res) => {
  try {
    const pd = await PublicDish.findById(req.params.id).lean();
    if (!pd) return res.status(404).json({ error: "Not found" });
    res.json(pd);
  } catch (err) {
    console.error("GET /api/public/dishes/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// usuń własną opublikowaną potrawę
app.delete("/api/public/dishes/:id", auth, async (req, res) => {
  try {
    const pd = await PublicDish.findById(req.params.id);
    if (!pd) return res.status(404).json({ error: "Not found" });
    if (!pd.author?.id || pd.author.id.toString() !== req.user.id)
      return res.status(403).json({ error: "No permission" });
    await pd.remove();
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/public/dishes/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET basic user info (chronione) - id, email, username, avatar
app.get("/api/user/me", auth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(404).json({ error: "Użytkownik nie istnieje" });
    res.json({
      user: {
        id: u._id,
        email: u.email,
        username: u.username,
        avatar: u.avatar || null,
      },
    });
  } catch (err) {
    console.error("GET /api/user/me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// aktualizuj profil użytkownika (chronione)
app.post(
  "/api/user/profile",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });

      // jeśli przesłano nowy avatar
      if (req.file) {
        // usuń stary plik tylko jeśli to był lokalny upload (nie URL Google)
        if (user.avatar && user.avatar.startsWith("/uploads/")) {
          try {
            fs.unlinkSync(path.join(__dirname, "public", user.avatar));
          } catch (e) {
            console.warn("Avatar file delete failed:", e);
          }
        }
        // zapisz nową ścieżkę
        user.avatar = "/uploads/" + req.file.filename;
      }

      // aktualizuj inne pola jeśli przesłano
      if (req.body.username) user.username = req.body.username;
      if (req.body.email) user.email = req.body.email;
      if (req.body.currentPassword && req.body.newPassword) {
        const valid = await bcrypt.compare(
          req.body.currentPassword,
          user.passwordHash
        );
        if (!valid)
          return res.status(400).json({ error: "Niepoprawne aktualne hasło" });
        user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
      }

      await user.save();

      // zwróć zaktualizowane podstawowe dane
      res.json({
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
      });
    } catch (err) {
      console.error("POST /api/user/profile error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// konfiguracja mailera
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "janmaciej.bukowski@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD, // dodaj to do .env
  },
});

// zgłoszenie potrawy/jadłospisu (chronione)
app.post("/api/report", auth, async (req, res) => {
  try {
    const { type, id, reason, details } = req.body;
    if (!type || !id || !reason) {
      return res.status(400).json({ error: "Brak wymaganych danych" });
    }

    const reporter = req.user.username;
    let item;

    // Pobierz zgłaszany element
    if (type === "dish") {
      item = await PublicDish.findById(id).lean();
    } else if (type === "menu") {
      item = await PublicMenu.findById(id).lean();
    }

    if (!item) {
      return res.status(404).json({ error: "Nie znaleziono elementu" });
    }

    // Wyślij email
    await transporter.sendMail({
      from: "janmaciej.bukowski@gmail.com",
      to: "janmaciej.bukowski@gmail.com",
      subject: `[Jadłospis] Zgłoszenie ${
        type === "dish" ? "potrawy" : "jadłospisu"
      }`,
      html: `
        <h3>Nowe zgłoszenie</h3>
        <p><strong>Typ:</strong> ${
          type === "dish" ? "Potrawa" : "Jadłospis"
        }</p>
        <p><strong>Zgłaszający:</strong> ${reporter}</p>
        <p><strong>Zgłoszony element:</strong> ${item.name || item.title}</p>
        <p><strong>ID:</strong> ${id}</p>
        <p><strong>query:</strong>{"_id": ObjectId("${id}")}</p>
        <p><strong>Powód:</strong> ${reason}</p>
        ${details ? `<p><strong>Szczegóły:</strong> ${details}</p>` : ""}
        <p><strong>Autor:</strong> ${item.author?.username || "brak"}</p>
        <hr>
        <p>Link do panelu admina: ${process.env.FRONTEND_URL}/admin</p>
      `,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({ error: "Nie udało się wysłać zgłoszenia" });
  }
});

// --- PUBLIC image generation via AI (uses AI_KEY from .env) ---
app.post("/api/ai/images", async (req, res) => {
  try {
    const {
      prompt,
      n = 1,
      model = "sxdl",
      size = "1024x1024",
    } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const aiKey = process.env.AI_KEY;
    if (!aiKey)
      return res.status(500).json({ error: "AI_KEY not configured on server" });

    console.log("Requesting AI with:", { prompt, n, model, size });

    // call infip.pro image generation
    const aiResp = await fetch("https://api.infip.pro/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, n, size }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI service error:", aiResp.status, txt);
      return res.status(502).json({ error: "AI service error", detail: txt });
    }

    const aiBody = await aiResp.json();
    console.log("Full AI response:", JSON.stringify(aiBody, null, 2));

    // infip.pro zwraca { data: [{url: "...", ...}, ...], created: ..., usage: ... }
    const imgObjects = Array.isArray(aiBody.data) ? aiBody.data : [];
    console.log("Image objects extracted:", imgObjects);

    const results = [];

    for (const imgObj of imgObjects) {
      try {
        // każdy imgObj to { url: "...", b64_json: null, model: null }
        const imgUrl = imgObj?.url;
        console.log("Processing image URL:", imgUrl);

        if (!imgUrl || typeof imgUrl !== "string") {
          console.warn("Invalid image URL:", imgUrl);
          continue;
        }

        // fetch image bytes and save locally into uploadsDir
        const fetched = await fetch(imgUrl);
        if (!fetched.ok) {
          console.warn(
            "Failed to fetch generated image:",
            imgUrl,
            fetched.status
          );
          continue;
        }
        const arrayBuf = await fetched.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const ext = path.extname(new URL(imgUrl).pathname) || ".png";
        const filename =
          Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext;
        const outPath = path.join(uploadsDir, filename);
        fs.writeFileSync(outPath, buffer);
        const storedPath = `/uploads/${filename}`;
        const baseUrl =
          process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
        const fullUrl = `${baseUrl}${storedPath}`;
        results.push({ path: storedPath, url: fullUrl });
        console.log("Saved image:", storedPath);
      } catch (e) {
        console.error("save generated image error:", e);
      }
    }

    console.log("Final results:", results);
    return res.json({ images: results, seed: aiBody.created ?? null });
  } catch (e) {
    console.error("POST /api/ai/images error:", e);
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
});

// GET public user info (no auth needed)
app.get("/api/user/:id", async (req, res) => {
  try {
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json({
      user: {
        id: u._id,
        username: u.username,
        avatar: u.avatar || null,
      },
    });
  } catch (err) {
    console.error("GET /api/user/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
