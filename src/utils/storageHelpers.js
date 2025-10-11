export function ensureLocalDefault(key, defaultValue) {
  try {
    const cur = localStorage.getItem(key);
    if (cur === null || cur === undefined) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  } catch {}
}
