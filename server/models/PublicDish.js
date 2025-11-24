const mongoose = require("mongoose");

const PublicDishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tags: { type: [String], default: [] },
  params: { type: String, default: "" },
  ingredients: {
    type: [
      {
        name: { type: String, required: true },
        amount: { type: String, required: true },
        unit: { type: String, required: true },
      },
    ],
    default: [],
  },
  maxRepeats: { type: Number, default: 1 },
  allowedMeals: { type: [String], default: ["śniadanie", "obiad", "kolacja"] },
  rating: { type: Number, default: 0 },
  favorite: { type: Boolean, default: false },
  avatar: { type: String, default: "" },
  maxAcrossWeeks: { type: Number, default: null },
  allowedDays: {
    type: [String],
    default: [
      "Poniedziałek",
      "Wtorek",
      "Środa",
      "Czwartek",
      "Piątek",
      "Sobota",
      "Niedziela",
    ],
  },
  // NEW: przechowujemy kto polubił (lista userId)
  likes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
  },
  public: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PublicDish", PublicDishSchema);
