import DAYS from "../utils/days.js";

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Utilities for dishes stored in localStorage. Always read current storage, merge and emit update.
function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readDishes() {
  return safeParse(localStorage.getItem("dishes"), []);
}

function writeDishes(arr) {
  try {
    localStorage.setItem("dishes", JSON.stringify(arr));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("dishesUpdated", { detail: arr }));
  } catch {}
  return arr;
}

const dishes = readDishes();

// dodaj eksport dishes
export { dishes };

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

  // Dodaj normalizację allowedDays
  if (!Array.isArray(dish.allowedDays)) {
    dish.allowedDays = DAYS;
    normalized = true;
  }
};

dishes.forEach(normalizeDish);
if (normalized) {
  localStorage.setItem("dishes", JSON.stringify(dishes));
}

// addDish: merge with existing localStorage instead of using a static list
export function addDish(dish) {
  if (!dish || !dish.name) return null;
  const existing = readDishes();

  // normalize incoming dish
  const norm = {
    name: String(dish.name).trim(),
    tags: Array.isArray(dish.tags)
      ? dish.tags
      : dish.tags
      ? ("" + dish.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
    params: dish.params || "",
    ingredients: Array.isArray(dish.ingredients)
      ? dish.ingredients
      : dish.ingredients
      ? ("" + dish.ingredients)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    probability: typeof dish.probability === "number" ? dish.probability : 100,
    maxRepeats: dish.maxRepeats != null ? Number(dish.maxRepeats) : 1,
    maxPerDay:
      dish.maxPerDay != null
        ? dish.maxPerDay === ""
          ? null
          : Number(dish.maxPerDay)
        : null,
    allowedMeals: Array.isArray(dish.allowedMeals)
      ? dish.allowedMeals
      : dish.allowedMeals
      ? ("" + dish.allowedMeals)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : ["śniadanie", "obiad", "kolacja"],
    rating: dish.rating != null ? Number(dish.rating) : 0,
    favorite: !!dish.favorite,
    color: dish.color || "",
    maxAcrossWeeks:
      dish.maxAcrossWeeks != null
        ? dish.maxAcrossWeeks === ""
          ? null
          : Number(dish.maxAcrossWeeks)
        : null,
    allowedDays: Array.isArray(dish.allowedDays)
      ? dish.allowedDays
      : dish.allowedDays
      ? String(dish.allowedDays)
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
      : DAYS,
  };

  // if exact name exists, append unique suffix to avoid accidental replace
  const exists = existing.find(
    (e) => (e.name || "").toLowerCase() === norm.name.toLowerCase()
  );
  if (exists) {
    // create unique name
    let i = 2;
    let base = norm.name;
    while (
      existing.find(
        (e) =>
          (e.name || "").toLowerCase() ===
          (norm.name + " (" + i + ")").toLowerCase()
      )
    )
      i++;
    norm.name = base + " (" + i + ")";
  }

  existing.push(norm);
  writeDishes(existing);
  return norm;
}

// helper exports (optional)
export function getAllDishes() {
  return readDishes();
}

export function replaceAllDishes(arr) {
  return writeDishes(Array.isArray(arr) ? arr : []);
}

export default getAllDishes;
