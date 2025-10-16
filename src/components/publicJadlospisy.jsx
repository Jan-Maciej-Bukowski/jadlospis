import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PublicJadlospisy({ onLoad }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/public/menus?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Fetch failed");
      const body = await res.json();
      setItems(body.items || []);
    } catch (err) {
      console.error("fetch public menus:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się pobrać listy",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const importPublicMenu = (pm) => {
    try {
      // save to savedMenus
      const saved = JSON.parse(localStorage.getItem("savedMenus") || "[]");
      const id = Date.now().toString();
      const entry = {
        id,
        name: pm.title || `Publiczny ${id}`,
        menu: pm.menu,
        createdAt: new Date().toISOString(),
      };
      saved.push(entry);
      localStorage.setItem("savedMenus", JSON.stringify(saved));

      // create dish list and add missing dishes (preserve full metadata if provided)
      const placeholder = "Brak potraw";
      const flatDays = Array.isArray(pm.menu[0]) ? pm.menu.flat() : pm.menu;
      const used = new Set();
      flatDays.forEach((entry) =>
        ["śniadanie", "obiad", "kolacja"].forEach((m) => {
          const d = entry?.[m];
          const dishName = d?.name ?? d;
          if (!dishName) return;
          if (dishName === placeholder) return;
          used.add(dishName);
        })
      );
      const dishesArray = Array.from(used);
      if (dishesArray.length > 0) {
        const lists = JSON.parse(localStorage.getItem("dishLists") || "[]");
        const listId = `public-${Date.now()}`;
        const listName = pm.title
          ? `Z ${pm.title}`
          : `Z publicznego ${new Date().toLocaleString()}`;
        lists.push({ id: listId, name: listName, dishes: dishesArray });
        localStorage.setItem("dishLists", JSON.stringify(lists));
        try {
          window.dispatchEvent(
            new CustomEvent("dishListsUpdated", { detail: lists })
          );
        } catch {}
        // If public menu included full dishes metadata, import them; otherwise add minimal entries
        // Import potraw: używaj dishesAll() i addDish(), potem odczytaj aktualny stan i rozgłoś event
        let changed = false;
        if (Array.isArray(pm.dishes) && pm.dishes.length > 0) {
          pm.dishes.forEach((imp) => {
            if (!imp || !imp.name) return;
            const allNow = dishesAll();
            const exists = allNow.find((d) => d.name === imp.name);
            if (!exists) {
              // addDish wykona normalizację i zapis
              try {
                addDish(imp);
                changed = true;
              } catch (e) {
                // fallback: push to local array then mark changed
                const fallback = allNow;
                fallback.push(imp);
                localStorage.setItem("dishes", JSON.stringify(fallback));
                changed = true;
              }
            } else {
              // merge metadata into istniejący wpis i zapisz
              Object.assign(exists, imp);
              changed = true;
              localStorage.setItem("dishes", JSON.stringify(dishesAll()));
            }
          });
        } else {
          // brak pełnych metadanych -> dodaj minimalne potrawy przez addDish
          dishesArray.forEach((dn) => {
            const allNow = dishesAll();
            if (!allNow.find((x) => x.name === dn)) {
              addDish({ name: dn });
              changed = true;
            }
          });
        }
        if (changed) {
          const current = dishesAll();
          try {
            localStorage.setItem("dishes", JSON.stringify(current));
            window.dispatchEvent(
              new CustomEvent("dishesUpdated", { detail: current })
            );
          } catch (err) {
            console.warn(
              "Nie udało się zapisać/notify potraw po imporcie:",
              err
            );
          }
        }
      }

      // load into planner immediately
      try {
        window.dispatchEvent(
          new CustomEvent("loadSavedMenu", { detail: pm.menu })
        );
      } catch {}
      Swal.fire({
        icon: "success",
        title: "Zaimportowano",
        text: "Jadłospis został dodany do zapisanych i dodano listę potraw.",
      });
    } catch (err) {
      console.error("importPublicMenu:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się zaimportować jadłospisu.",
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Publiczne jadłospisy
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po tytule..."
          size="small"
        />
        <Button variant="contained" onClick={fetchList} disabled={loading}>
          Szukaj
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <List>
          {items.length === 0 && (
            <Typography>Brak publicznych jadłospisów</Typography>
          )}
          {items.map((it) => (
            <ListItem
              key={it._id}
              divider
              secondaryAction={
                <Box>
                  <Button
                    size="small"
                    onClick={() => {
                      importPublicMenu(it);
                    }}
                  >
                    Załaduj / Importuj
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      // open details in new tab (route not implemented) — just show quick modal
                      Swal.fire({
                        title: it.title,
                        html: `<pre style="text-align:left">${JSON.stringify(
                          it.menu,
                          null,
                          2
                        )}</pre>`,
                        width: 800,
                      });
                    }}
                  >
                    Podgląd
                  </Button>
                </Box>
              }
            >
              <ListItemText
                primary={it.title}
                secondary={`autor: ${
                  it.author?.username || "anonim"
                } • ${new Date(it.createdAt).toLocaleString()}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
