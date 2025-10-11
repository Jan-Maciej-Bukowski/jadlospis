const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },

  // tutaj przechowujemy wszystkie dane użytkownika (potrawy, listy, ustawienia, jadłospisy)
  data: {
    dishes: { type: Array, default: [] }, // src/js/potrawy
    dishLists: { type: Array, default: [] }, // listy potraw
    lastMenu: { type: mongoose.Schema.Types.Mixed, default: null }, // aktualny widoczny jadłospis
    savedMenus: { type: Array, default: [] }, // wszystkie zapisane jadlospisy
    settings: { type: mongoose.Schema.Types.Mixed, default: {} }, // ustawienia aplikacji
  },
});

module.exports = mongoose.model("User", UserSchema);
