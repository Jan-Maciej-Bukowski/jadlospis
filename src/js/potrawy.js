const stripHtml = (html = "") =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const dishes = JSON.parse(localStorage.getItem("dishes")) || [];

// remove html from dishes
dishes.forEach((dish) => {
  dish.params = stripHtml(dish.params);
});

// Normalize existing dishes loaded from localStorage:
// - ensure tags is array
// - ensure ingredients is array (split by newline or comma)
// - ensure numeric fields have correct types
let normalized = false;
const normalizeDish = (dish) => {
  if (!dish) return;
  // params already sanitized above
  if (dish.tags && !Array.isArray(dish.tags)) {
    dish.tags = ("" + dish.tags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    normalized = true;
  }
  if (dish.ingredients && !Array.isArray(dish.ingredients)) {
    const s = "" + dish.ingredients;
    dish.ingredients = s.includes("\n")
      ? s
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
      : s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
    normalized = true;
  }
  if (dish.probability != null && typeof dish.probability !== "number") {
    const n = Number(dish.probability);
    dish.probability = isNaN(n) ? 100 : n;
    normalized = true;
  }
  if (dish.maxRepeats != null && typeof dish.maxRepeats !== "number") {
    const n = Number(dish.maxRepeats);
    dish.maxRepeats = isNaN(n) ? 1 : n;
    normalized = true;
  }
  if (
    dish.maxAcrossWeeks != null &&
    dish.maxAcrossWeeks !== "" &&
    typeof dish.maxAcrossWeeks !== "number"
  ) {
    const n = Number(dish.maxAcrossWeeks);
    dish.maxAcrossWeeks = isNaN(n) ? null : n;
    normalized = true;
  }
  if (
    !dish.allowedMeals ||
    (!Array.isArray(dish.allowedMeals) && typeof dish.allowedMeals === "string")
  ) {
    if (Array.isArray(dish.allowedMeals)) return;
    // if already stored as comma string, convert
    if (dish.allowedMeals && typeof dish.allowedMeals === "string") {
      dish.allowedMeals = dish.allowedMeals
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      normalized = true;
    } else if (!dish.allowedMeals) {
      dish.allowedMeals = ["śniadanie", "obiad", "kolacja"];
      normalized = true;
    }
  }
};

dishes.forEach(normalizeDish);
if (normalized) {
  localStorage.setItem("dishes", JSON.stringify(dishes));
}

export function addDish(data) {
  const ingredientsArr = Array.isArray(data.ingredients)
    ? data.ingredients
    : typeof data.ingredients === "string"
    ? // split by newline when multiline provided, otherwise by comma
      data.ingredients.includes("\n")
      ? data.ingredients
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : data.ingredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
    : [];

  const newDish = new Dish({
    name: data.name,
    tags: Array.isArray(data.tags)
      ? data.tags
      : typeof data.tags === "string"
      ? data.tags.split(",").map((t) => t.trim())
      : [],
    params: data.params,
    probability: data.probability,
    maxRepeats: data.maxRepeats || 1,
    ingredients: ingredientsArr,
    maxPerDay: data.maxPerDay ?? null,
    allowedMeals: data.allowedMeals || ["śniadanie", "obiad", "kolacja"],
    rating: data.rating || 0,
    favorite: !!data.favorite,
    color: data.color || "",
    maxAcrossWeeks: data.maxAcrossWeeks ?? null, // null = brak limitu dla zakresu tygodni
  });

  saveDishesToLocalStorage();
  //console.info("[potrawy] added dish:", newDish);
  return newDish;
}

class Dish {
  constructor({
    name = "NOT SPECIFIED",
    tags = [],
    params = "nie ma",
    probability = 100,
    ingredients = [],
    extendedIngredients = null,
    image = null,
    maxRepeats = 1,
    allowedMeals = ["śniadanie", "obiad", "kolacja"],
    rating = 0,
    favorite = false,
    color = "", // kolor tła w jadłospisie
    maxAcrossWeeks = null, // ile razy max w wygenerowanym przedziale (null = brak limitu)
  } = {}) {
    this.name = name;
    this.tags = tags;
    this.params = params;
    this.probability = probability;
    this.ingredients = ingredients;
    this.extendedIngredients = extendedIngredients;
    this.image = image;
    this.maxRepeats = maxRepeats;
    this.allowedMeals = allowedMeals;
    this.rating = rating;
    this.favorite = favorite;
    this.color = color;
    this.maxAcrossWeeks = maxAcrossWeeks;
    dishes.push(this);
  }
}

function saveDishesToLocalStorage() {
  localStorage.setItem("dishes", JSON.stringify(dishes));
}

export default dishes;

window.dane = () => {
  console.log(dishes);
};
