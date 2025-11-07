import React, { useEffect, useState } from "react";
import { ensureLocalDefault } from "../utils/storageHelpers";
import { safeParse } from "../utils/safeParse"; // create helper or inline parse below
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Swal from "sweetalert2";
import log from "../utils/log";

const STORAGE_KEY = "dishLists";

// ensure dishes exist
ensureLocalDefault("dishes", []);

export default function Listy() {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  // touch-dnd state kept on window to survive re-renders
  const createGhost = (label) => {
    // invisible ghost (text/color hidden) — payload stored in dataset only
    const g = document.createElement("div");
    g.dataset.payload = String(label || "");
    Object.assign(g.style, {
      position: "fixed",
      top: 0,
      left: 0,
      padding: "6px 10px",
      background: "transparent",
      color: "transparent",
      borderRadius: "6px",
      zIndex: 99999,
      pointerEvents: "none",
      fontSize: "0.9rem",
      opacity: "0",
    });
    //g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
    return g;
  };

  // cleanup leftover ghost on unmount/pagehide
  useEffect(() => {
    const cleanupGlobal = () => {
      try {
        if (window.__touchDrag?.ghost) window.__touchDrag.ghost.remove();
      } catch (err) {}
      window.__touchDrag = null;
      document.body.style.touchAction = "";
    };
    window.addEventListener("pagehide", cleanupGlobal);
    return () => {
      window.removeEventListener("pagehide", cleanupGlobal);
      cleanupGlobal();
    };
  }, []);

  const startTouchDrag = (e, dishName) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    // prevent page scrolling / pull-to-refresh while dragging
    const prevTouchAction = document.body.style.touchAction;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevDocOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    // store payload and ghost
    window.__touchDrag = { payload: dishName, ghost: createGhost(dishName) };
    window.__touchDrag.ghost.style.top = t.clientY + 6 + "px";
    window.__touchDrag.ghost.style.left = t.clientX + 6 + "px";

    const cleanup = () => {
      try {
        if (window.__touchDrag?.ghost) window.__touchDrag.ghost.remove();
      } catch (err) {}
      window.__touchDrag = null;
      document.body.style.touchAction = prevTouchAction || "";
      document.body.style.overscrollBehavior = prevBodyOverscroll || "";
      document.documentElement.style.overscrollBehavior =
        prevDocOverscroll || "";
      window.removeEventListener("touchmove", onMove, { passive: false });
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      document.removeEventListener("visibilitychange", onVisibility);
    };

    const onMove = (ev) => {
      const tt = ev.touches && ev.touches[0];
      if (!tt || !window.__touchDrag) return;
      window.__touchDrag.ghost.style.top = tt.clientY + 6 + "px";
      window.__touchDrag.ghost.style.left = tt.clientX + 6 + "px";
      // preventDefault only when allowed (avoids Intervention console message)
      if (ev.cancelable) ev.preventDefault();
    };

    const onEnd = (ev) => {
      const last = ev.changedTouches && ev.changedTouches[0];
      if (last && window.__touchDrag) {
        const el = document.elementFromPoint(last.clientX, last.clientY);
        const listEl = el && el.closest && el.closest("[data-list-id]");
        if (listEl) {
          onDropToList(
            {
              preventDefault: () => {},
              dataTransfer: { getData: () => window.__touchDrag.payload },
            },
            listEl.dataset.listId
          );
        }
      }
      cleanup();
    };

    const onVisibility = () => {
      if (document.hidden) cleanup();
    };

    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    document.addEventListener("visibilitychange", onVisibility);
  };

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setLists(JSON.parse(raw));
      } catch {
        setLists([]);
      }
    }
    // nasłuchuj aktualizacji list utworzonych z importu jadłospisu
    const onUpdated = (ev) => {
      try {
        const next =
          ev?.detail || JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        setLists(next);
      } catch {
        setLists([]);
      }
    };
    window.addEventListener("dishListsUpdated", onUpdated);
    return () => window.removeEventListener("dishListsUpdated", onUpdated);
  }, []);

  const save = (next) => {
    setLists(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const createList = () => {
    const name = (newName || "").trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Podaj nazwę listy" });
      return;
    }
    const id = Date.now().toString();
    const next = [...lists, { id, name, dishes: [] }];
    save(next);
    setNewName("");
  };

  const removeList = (id) => {
    Swal.fire({
      title: "Usunąć listę?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    }).then((r) => {
      if (r.isConfirmed) save(lists.filter((l) => l.id !== id));
    });
  };

  const onDragStart = (e, dishName) => {
    e.dataTransfer.setData("text/plain", dishName);
    // ukryj przegląd przeciągania przeglądarki (czarne prostokąty) na desktopie/mobilu
    try {
      const img = new Image();
      img.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XqzXQAAAAASUVORK5CYII=";
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch (err) {
      /* noop */
    }
  };

  const onDropToList = (e, listId) => {
    e.preventDefault();
    const dishName = e.dataTransfer.getData("text/plain");
    if (!dishName) return;
    const next = lists.map((l) => {
      if (l.id !== listId) return l;
      if (l.dishes.includes(dishName)) return l;
      return { ...l, dishes: [...l.dishes, dishName] };
    });
    save(next);
  };

  const onRemoveDishFromList = (listId, name) => {
    const next = lists.map((l) =>
      l.id === listId ? { ...l, dishes: l.dishes.filter((d) => d !== name) } : l
    );
    save(next);
  };

  // use localStorage dishes instead of importing static list
  const [allDishes, setAllDishes] = useState(() =>
    (() => {
      try {
        const raw = localStorage.getItem("dishes");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })()
  );

  // update displayed "all dishes" when storage changes
  useEffect(() => {
    const storageHandler = (e) => {
      if (e.key === "dishes") {
        try {
          setAllDishes(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {
          setAllDishes([]);
        }
      }
    };
    window.addEventListener("storage", storageHandler);
    window.addEventListener("dishesUpdated", () => {
      try {
        setAllDishes(JSON.parse(localStorage.getItem("dishes") || "[]"));
      } catch {
        setAllDishes([]);
      }
    });
    return () => {
      window.removeEventListener("storage", storageHandler);
      window.removeEventListener("dishesUpdated", () => {});
    };
  }, []);

  return (
    <Box sx={{ p: 2 }} className="not-scrollable">
      <Typography variant="h5" sx={{ mb: 2 }}>
        Listy potraw
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Nazwa listy"
          size="small"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="contained" onClick={createList}>
          Dodaj listę
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <Paper sx={{ p: 2, minWidth: 240, maxWidth: 360 }}>
          <Typography variant="subtitle1">Wszystkie potrawy</Typography>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {allDishes.map((d, i) => (
              <Chip
                key={i}
                label={d.name}
                draggable
                onDragStart={(e) => onDragStart(e, d.name)}
                onTouchStart={(e) => startTouchDrag(e, d.name)}
                variant="outlined"
                sx={{ cursor: "grab" }}
              />
            ))}
          </Box>
        </Paper>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {lists.map((l) => (
            <Paper
              key={l.id}
              sx={{
                p: 2,
                minWidth: 220,
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropToList(e, l.id)}
              data-list-id={l.id} // for touch fallback
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle1">{l.name}</Typography>
                <IconButton size="small" onClick={() => removeList(l.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {l.dishes.length === 0 && (
                  <Typography variant="body2">Brak potraw</Typography>
                )}
                {l.dishes.map((dn) => (
                  <Chip
                    key={dn}
                    label={dn}
                    onDelete={() => onRemoveDishFromList(l.id, dn)}
                  />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
