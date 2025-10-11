const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
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
app.use(cors());
app.use(helmet());
app.use(express.json());

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
      user: { id: user._id, email: user.email, username: user.username },
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
      user: { id: user._id, email: user.email, username: user.username },
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
        user.data[k] = newData[k];
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

app.listen(PORT, () =>
  console.log(`Auth server running on http://localhost:${PORT}`)
);
