export function safeParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.log("err in safeParse.jsx: ",e)
    return fallback;
  }
}
