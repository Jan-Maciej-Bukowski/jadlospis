const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const User = require("./models/User");
const auth = require("./middleware/auth");

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGODB_URI is not set.");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("ERROR: JWT_SECRET is not set.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const app = express();

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
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Tylko pliki obrazkowe są dozwolone"));
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
      if (!file) return res.status(400).json({ error: "Brak pliku" });

      const user = await User.findById(req.user.id);
      if (!user)
        return res.status(404).json({ error: "Użytkownik nie istnieje" });

      // remove previous avatar file if stored at top-level or in data.settings
      const prevTop = user.avatar;
      const prevSettings = user.data?.settings?.avatar;
      const removeIfLocal = (p) => {
        if (p && p.startsWith("/uploads/")) {
          const fp = path.join(__dirname, p);
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          } catch (e) {
            /* ignore */
          }
        }
      };
      removeIfLocal(prevTop);
      removeIfLocal(prevSettings);

      const storedPath = `/uploads/${file.filename}`;
      // store avatar on top-level user.avatar (only path)
      user.avatar = storedPath;

      await user.save();

      console.log(
        "Saved avatar for user",
        user._id.toString(),
        "->",
        storedPath
      );

      const fullUrl = `${req.protocol}://${req.get("host")}${storedPath}`;
      return res.json({ path: storedPath, url: fullUrl, avatar: storedPath });
    } catch (e) {
      console.error("POST /api/user/avatar error:", e);
      return res.status(500).json({ error: "Server error" });
    }
  });
});

// delete avatar (removes file and clears path in DB)
app.delete("/api/user/avatar", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ error: "Użytkownik nie istnieje" });
    // remove top-level avatar file if present, and also clear any legacy settings.avatar
    const prevTop = user.avatar;
    const prevSettings = user.data?.settings?.avatar;
    if (prevTop && prevTop.startsWith("/uploads/")) {
      const prevFile = path.join(__dirname, prevTop);
      try {
        if (fs.existsSync(prevFile)) fs.unlinkSync(prevFile);
      } catch (e) {
        /* ignore */
      }
    }
    if (prevSettings && prevSettings.startsWith("/uploads/")) {
      const prevFile2 = path.join(__dirname, prevSettings);
      try {
        if (fs.existsSync(prevFile2)) fs.unlinkSync(prevFile2);
      } catch (e) {
        /* ignore */
      }
    }
    user.avatar = null;
    // keep user.data.settings intact (do not remove other settings)
    await user.save();
    res.json({ ok: true, path: null });
  } catch (e) {
    console.error("DELETE /api/user/avatar error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
