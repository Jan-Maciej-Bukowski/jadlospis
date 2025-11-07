const mongoose = require("mongoose");

const PublicDishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tags: { type: [String], default: [] },
  params: { type: String, default: "" },
  ingredients: { type: [String], default: [] },
  probability: { type: Number, default: 100 },
  maxRepeats: { type: Number, default: 1 },
  allowedMeals: { type: [String], default: ["śniadanie", "obiad", "kolacja"] },
  rating: { type: Number, default: 0 },
  favorite: { type: Boolean, default: false },
  color: { type: String, default: "" },
  maxAcrossWeeks: { type: Number, default: null },
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
  },
  public: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
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
});

module.exports = mongoose.model("PublicDish", PublicDishSchema);
