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
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PublicJadlospisy({ onLoad }) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  const daysOfWeek = [
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
    "Niedziela",
  ];

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

  const togglePreview = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  const renderPreviewTable = (menu) => {
    // menu can be multiweek or single-week; take first week for preview
    const week = Array.isArray(menu[0]) ? menu[0] : menu;
    const allDishes = dishesAll();
    return (
      <Box sx={{ width: "100%", overflowX: "auto", mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontSize: "0.85rem" }}>Dzień</TableCell>
              <TableCell sx={{ fontSize: "0.85rem" }}>Śniadanie</TableCell>
              <TableCell sx={{ fontSize: "0.85rem" }}>Obiad</TableCell>
              <TableCell sx={{ fontSize: "0.85rem" }}>Kolacja</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {week.map((entry, idx) => {
              const dayLabel = daysOfWeek[idx] || `Dzień ${idx + 1}`;
              return (
                <TableRow key={idx}>
                  <TableCell sx={{ fontSize: "0.8rem", width: 120 }}>
                    {dayLabel}
                  </TableCell>
                  {["śniadanie", "obiad", "kolacja"].map((meal) => {
                    const d = entry?.[meal];
                    const name = d?.name ?? d ?? "Brak potraw";
                    const dishObj = allDishes.find((x) => x.name === name);
                    const bg = dishObj?.color || d?.color || "";
                    return (
                      <TableCell
                        key={meal}
                        sx={{
                          fontSize: "0.8rem",
                          verticalAlign: "top",
                          backgroundColor: bg || "transparent",
                          maxWidth: 220,
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.85rem" }}
                            >
                              {name}
                            </Typography>
                          </Box>
                          {Array.isArray(dishObj?.tags) &&
                            dishObj.tags.length > 0 && (
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.5,
                                  flexWrap: "wrap",
                                  mt: 0.5,
                                }}
                              >
                                {dishObj.tags.slice(0, 4).map((t, i) => (
                                  <Chip
                                    key={i}
                                    label={t}
                                    size="small"
                                    sx={{ fontSize: "0.7rem" }}
                                  />
                                ))}
                              </Box>
                            )}
                        </Box>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  };

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
        // Import potraw: używaj dishesAll() i addDish(), potem odczytaj aktualny stan i rozgłoś event
        let changed = false;
        if (Array.isArray(pm.dishes) && pm.dishes.length > 0) {
          pm.dishes.forEach((imp) => {
            if (!imp || !imp.name) return;
            const allNow = dishesAll();
            const exists = allNow.find((d) => d.name === imp.name);
            if (!exists) {
              try {
                addDish(imp);
                changed = true;
              } catch (e) {
                const fallback = allNow;
                fallback.push(imp);
                localStorage.setItem("dishes", JSON.stringify(fallback));
                changed = true;
              }
            } else {
              Object.assign(exists, imp);
              changed = true;
              localStorage.setItem("dishes", JSON.stringify(dishesAll()));
            }
          });
        } else {
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
          {items.map((it, idx) => (
            <Box key={it._id || idx}>
              <ListItem divider>
                <ListItemText
                  primary={it.title}
                  secondary={`autor: ${
                    it.author?.username || "anonim"
                  } • ${new Date(it.createdAt).toLocaleString()}`}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" onClick={() => importPublicMenu(it)}>
                    importuj
                  </Button>
                  {/*
                  just simple alert (ugly :<)
                  
                  <Button
                    size="small"
                    onClick={() =>
                      Swal.fire({
                        title: it.title,
                        html: `<pre style="text-align:left">${JSON.stringify(
                          it.menu,
                          null,
                          2
                        )}</pre>`,
                        width: 800,
                      })
                    }
                  >
                    Podgląd
                    
                  </Button>
                  */}
                  <IconButton
                    onClick={() => togglePreview(idx)}
                    aria-expanded={openIndex === idx}
                    aria-label="rozwiń podgląd"
                    size="small"
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform:
                          openIndex === idx ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 180ms linear",
                      }}
                    />
                  </IconButton>
                </Box>
              </ListItem>

              <Collapse in={openIndex === idx} timeout="auto" unmountOnExit>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle1">
                    Mini-podgląd jadłospisu
                  </Typography>
                  {renderPreviewTable(it.menu)}
                </Box>
              </Collapse>
            </Box>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
