export function stripQuotes(str) {
  if (typeof str !== "string") return str;
  return str.replace(/^["']|["']$/g, "");
}
