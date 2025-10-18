export const INGREDIENT_LIMITS = {
  kg: 100,
  g: 10000,
  l: 50,
  ml: 5000,
  szt: 1000,
  łyżka: 100,
  łyżeczka: 100,
  szklanka: 50,
};

export const validateAmount = (amount, unit) => {
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) return "Ilość musi być większa od 0";

  if (INGREDIENT_LIMITS[unit] && val > INGREDIENT_LIMITS[unit]) {
    return `Wartość ${val} ${unit} wydaje się zbyt duża. Maksymalna wartość to ${INGREDIENT_LIMITS[unit]} ${unit}`;
  }

  return null;
};
