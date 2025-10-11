const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");

const USERS_FILE = path.join(__dirname, "users.json");
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/jadlospis";

async function run() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB for migration");

  if (!fs.existsSync(USERS_FILE)) {
    console.log("No users.json found, nothing to migrate.");
    process.exit(0);
  }

  const raw = fs.readFileSync(USERS_FILE, "utf8");
  let users = [];
  try {
    users = JSON.parse(raw || "[]");
  } catch (err) {
    console.error("Invalid users.json:", err);
    process.exit(1);
  }

  for (const u of users) {
    if (!u.email || !u.username || !u.passwordHash) {
      console.warn("Skipping invalid user record:", u);
      continue;
    }
    const exists = await User.findOne({
      $or: [{ email: u.email }, { username: u.username }],
    });
    if (exists) {
      console.log("User exists, skipping:", u.email || u.username);
      continue;
    }
    try {
      await User.create({
        email: u.email,
        username: u.username,
        passwordHash: u.passwordHash,
        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      });
      console.log("Migrated user:", u.email || u.username);
    } catch (err) {
      console.error("Error creating user:", err);
    }
  }

  console.log("Migration finished.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
