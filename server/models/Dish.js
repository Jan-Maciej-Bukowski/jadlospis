const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, required: true },
});

const dishSchema = new mongoose.Schema({
  // ...existing fields...
  ingredients: [ingredientSchema],
  // ...existing fields...
});
