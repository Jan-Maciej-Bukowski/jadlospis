/**
 * userSync.js
 * - nasłuchuje eventów lokalnych (dishesUpdated, dishListsUpdated, lastMenuUpdated,
 *   savedMenusUpdated, settingsUpdated) oraz storage (zmiany z innych kart),
 *   pakuje aktualne dane z localStorage i wysyła PUT /api/user/data?merge=true
 * - debounce: 1500ms
 */
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const POLL_MS = 2000; // polling co 2s
const DEBOUNCE_MS = 1000;

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readLocalData() {
  return {
    dishes: safeParse(localStorage.getItem("dishes"), []),
    dishLists: safeParse(localStorage.getItem("dishLists"), []),
    lastMenu: safeParse(localStorage.getItem("lastMenu"), null),
    savedMenus: safeParse(localStorage.getItem("savedMenus"), []),
    settings: safeParse(localStorage.getItem("settings"), {}),
  };
}

function hashData(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

async function pushData(token, data) {
  if (!token) {
    console.debug("userSync: no token, skipping push");
    return false;
  }
  try {
    const res = await fetch(`${API}/api/user/data`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data, merge: true }),
      keepalive: true, // allow during unload
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn("userSync: push failed", res.status, body);
      return false;
    }
    console.debug("userSync: pushed user data (len)", {
      dishes: (data.dishes || []).length,
      dishLists: (data.dishLists || []).length,
      savedMenus: (data.savedMenus || []).length,
      settingsKeys: Object.keys(data.settings || {}).length,
    });
    return true;
  } catch (err) {
    console.warn("userSync: network error", err);
    return false;
  }
}

export function initUserSync() {
  let token = localStorage.getItem("token") || null;
  let lastHash = hashData(readLocalData()); // <- inicjalny hash z localStorage

  // allow external code to set lastHash (after applying server data on login)
  const setLastHashHandler = (e) => {
    try {
      const d = e?.detail;
      if (!d) return;
      lastHash = hashData(d);
      console.debug(
        "userSync: lastHash set from server data",
        lastHash ? lastHash.slice(0, 80) : lastHash
      );
    } catch (err) {
      console.warn("userSync: setLastHashHandler error", err);
    }
  };
  window.addEventListener("userSync:setLastHash", setLastHashHandler);

  // immediate sync helper (debounced)
  let debounceTimer = null;
  const schedulePush = (delay = DEBOUNCE_MS) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const data = readLocalData();
      const h = hashData(data);
      if (h === lastHash) {
        // nothing changed
        return;
      }
      const t = localStorage.getItem("token") || token;
      const ok = await pushData(t, data);
      if (ok) lastHash = h;
    }, delay);
  };

  // Polling fallback: jeśli eventy zawiodą, polling wykryje zmiany
  const poller = setInterval(() => {
    const data = readLocalData();
    const h = hashData(data);
    if (h !== lastHash) {
      console.debug("userSync: poll detected change -> scheduling push");
      schedulePush(0);
    }
  }, POLL_MS);

  // react to known events (components that dispatch these should still trigger faster)
  const localEvents = [
    "dishesUpdated",
    "dishListsUpdated",
    "lastMenuUpdated",
    "savedMenusUpdated",
    "settingsUpdated",
  ];
  const handlers = localEvents.map((ev) => {
    const h = () => {
      console.debug("userSync: event", ev, "-> schedule push");
      schedulePush();
    };
    window.addEventListener(ev, h);
    return { ev, h };
  });

  // storage (other tabs)
  const storageHandler = (e) => {
    if (!e.key) return;
    if (
      [
        "dishes",
        "dishLists",
        "lastMenu",
        "savedMenus",
        "settings",
        "token",
      ].includes(e.key)
    ) {
      if (e.key === "token") token = localStorage.getItem("token") || null;
      console.debug("userSync: storage event", e.key, "-> schedule push");
      schedulePush();
    }
  };
  window.addEventListener("storage", storageHandler);

  // immediate push on login
  const onLogin = () => {
    token = localStorage.getItem("token") || token;
    console.debug("userSync: userLoggedIn -> immediate push");
    const data = readLocalData();
    const h = hashData(data);
    // push immediately
    pushData(token, data).then((ok) => {
      if (ok) lastHash = h;
    });
  };
  window.addEventListener("userLoggedIn", onLogin);

  const onLogout = () => {
    console.debug("userSync: userLoggedOut -> clear token");
    token = null;
  };
  window.addEventListener("userLoggedOut", onLogout);

  // try to flush on unload (keepalive)
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const data = readLocalData();
      const h = hashData(data);
      const t = localStorage.getItem("token") || token;
      if (!t) return;
      if (h === lastHash) return;
      // best-effort push with keepalive
      pushData(t, data);
    }
  });

  window.addEventListener("beforeunload", () => {
    const data = readLocalData();
    const h = hashData(data);
    const t = localStorage.getItem("token") || token;
    if (!t) return;
    if (h === lastHash) return;
    // best-effort final push; keepalive allows sending during unload
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon(
            `${API}/api/user/data`,
            new Blob(
              [
                JSON.stringify({
                  data,
                  merge: true,
                  __keepalive: true,
                  token: t,
                }),
              ],
              { type: "application/json" }
            )
          )
        : null;
    } catch {
      // fallback: fetch with keepalive (may work)
      try {
        fetch(`${API}/api/user/data`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify({ data, merge: true }),
          keepalive: true,
        });
      } catch {}
    }
  });

  console.debug("userSync initialized (poll + events)");

  // cleanup - also remove our new listener
  return () => {
    handlers.forEach(({ ev, h }) => window.removeEventListener(ev, h));
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("userLoggedIn", onLogin);
    window.removeEventListener("userLoggedOut", onLogout);
    window.removeEventListener("beforeunload", () => {});
    window.removeEventListener("userSync:setLastHash", setLastHashHandler);
    clearInterval(poller);
  };
}
