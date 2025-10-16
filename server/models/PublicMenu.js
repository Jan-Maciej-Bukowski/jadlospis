const mongoose = require("mongoose");

const PublicMenuSchema = new mongoose.Schema({
  title: { type: String, required: true },
  menu: { type: Array, required: true }, // struktura jadłospisu (array days / arrays)
  // pełne metadane potraw użytych w menu (opcjonalne)
  dishes: { type: Array, default: [] },
  author: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username: { type: String },
  },
  tags: { type: [String], default: [] },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  public: { type: Boolean, default: true },
});

module.exports = mongoose.model("PublicMenu", PublicMenuSchema);
