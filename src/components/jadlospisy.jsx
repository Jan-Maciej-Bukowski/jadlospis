import React, { useEffect, useState, useRef } from "react";
import { ensureLocalDefault } from "../utils/storageHelpers";
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PublishIcon from "@mui/icons-material/Publish";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PublicIcon from "@mui/icons-material/Public";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";
import html2canvas from "html2canvas";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

const exportToImage = async (menu, name) => {
  // Stwórz tymczasowy element z jadłospisem
  const temp = document.createElement("div");
  temp.style.padding = "20px";
  temp.style.background = "white";
  temp.style.position = "absolute";
  temp.style.left = "-9999px";

  // Dodaj tytuł
  const title = document.createElement("h2");
  title.textContent = name;
  temp.appendChild(title);

  // Dodaj jadłospis
  const content = document.createElement("div");
  const days = Array.isArray(menu[0]) ? menu.flat() : menu;
  days.forEach((day, i) => {
    const dayDiv = document.createElement("div");
    dayDiv.style.marginBottom = "10px";
    dayDiv.innerHTML = `
      <strong>Dzień ${i + 1}</strong><br>
      Śniadanie: ${day.śniadanie?.name || day.śniadanie || "Brak"}<br>
      Obiad: ${day.obiad?.name || day.obiad || "Brak"}<br>
      Kolacja: ${day.kolacja?.name || day.kolacja || "Brak"}
    `;
    content.appendChild(dayDiv);
  });
  temp.appendChild(content);
  document.body.appendChild(temp);

  try {
    const canvas = await html2canvas(temp);
    const link = document.createElement("a");
    link.download = `jadlospis_${name.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    temp.remove();
  }
};

const exportToText = (menu, name) => {
  let text = `Jadłospis: ${name}\n\n`;
  const days = Array.isArray(menu[0]) ? menu.flat() : menu;

  days.forEach((day, i) => {
    text += `Dzień ${i + 1}\n`;
    text += `Śniadanie: ${day.śniadanie?.name || day.śniadanie || "Brak"}\n`;
    text += `Obiad: ${day.obiad?.name || day.obiad || "Brak"}\n`;
    text += `Kolacja: ${day.kolacja?.name || day.kolacja || "Brak"}\n\n`;
  });

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jadlospis_${name.replace(/\s+/g, "_")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function Jadlospisy() {
  const [saved, setSaved] = useState([]);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileRef = useRef(null);
  useEffect(() => {
    ensureLocalDefault("savedMenus", []);
    // keep saved from localStorage
    const raw = localStorage.getItem("savedMenus");
    try {
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  }, []);

  const refresh = () => {
    const raw = localStorage.getItem("savedMenus");
    try {
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  };

  const saveAll = (next) => {
    setSaved(next);
    localStorage.setItem("savedMenus", JSON.stringify(next));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Usuń zapisany jadłospis?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    }).then((r) => {
      if (!r.isConfirmed) return;
      const next = saved.filter((s) => s.id !== id);
      saveAll(next);
    });
  };

  const handleRename = async (item) => {
    const { value } = await Swal.fire({
      title: "Zmień nazwę",
      input: "text",
      inputValue: item.name,
      showCancelButton: true,
    });
    if (!value) return;
    const next = saved.map((s) =>
      s.id === item.id ? { ...s, name: value } : s
    );
    saveAll(next);
  };

  const handleExportOne = (item) => {
    // export only this saved menu (include minimal dishes used)
    const toExport = item.menu || [];
    const used = new Set();
    const placeholder = "Brak potraw";
    const flatDays = Array.isArray(toExport[0]) ? toExport.flat() : toExport;
    flatDays.forEach((entry) =>
      ["śniadanie", "obiad", "kolacja"].forEach((m) => {
        const d = entry?.[m];
        const name = d?.name ?? d;
        if (!name) return;
        if (name === placeholder) return;
        used.add(name);
      })
    );
    // dishesAll to funkcja -> wywołaj, aby dostać aktualną tablicę potraw
    const allForExport = dishesAll();
    const dishes = Array.from(used).map((n) => {
      const d = allForExport.find((x) => x.name === n);
      return d || { name: n };
    });
    const out = {
      meta: { createdAt: item.createdAt, source: "jadlospis-saved" },
      name: item.name,
      menu: item.menu,
      dishes,
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jadlospis_${item.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    Swal.fire({
      icon: "success",
      title: "Wyeksportowano",
      showConfirmButton: false,
      timer: 900,
    });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // expect { menu, name? }
        if (!parsed || !parsed.menu || !Array.isArray(parsed.menu)) {
          throw new Error("Nieprawidłowy format");
        }

        const name =
          parsed.name || `Import ${new Date().toISOString().slice(0, 10)}`;
        const id = Date.now().toString();
        const next = [
          ...saved,
          { id, name, menu: parsed.menu, createdAt: new Date().toISOString() },
        ];

        // --- nowość: utwórz listę potraw (dish list) z potraw z importowanego jadłospisu ---
        try {
          const placeholder = "Brak potraw";
          const flatDays = Array.isArray(parsed.menu[0])
            ? parsed.menu.flat()
            : parsed.menu;
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
            const existing = JSON.parse(
              localStorage.getItem("dishLists") || "[]"
            );
            const listId = `import-${Date.now()}`;
            const listName = `Z ${name}`;
            existing.push({ id: listId, name: listName, dishes: dishesArray });
            localStorage.setItem("dishLists", JSON.stringify(existing));
            // powiadom inne komponenty (Listy) że lista potraw się zmieniła
            try {
              window.dispatchEvent(
                new CustomEvent("dishListsUpdated", { detail: existing })
              );
            } catch (err) {
              console.warn("Nie udało się wysłać eventu dishListsUpdated", err);
            }

            // DODATKOWO: dodaj/importuj potrawy do globalnej listy potraw (dishes)
            try {
              // jeśli plik zawiera szczegółowe obiekty potraw w parsed.dishes -> użyj ich
              const importedDishes = Array.isArray(parsed.dishes)
                ? parsed.dishes
                : [];

              if (importedDishes.length > 0) {
                importedDishes.forEach((imp) => {
                  if (!imp || !imp.name) return;
                  const allNow = dishesAll();
                  const exists = allNow.find((d) => d.name === imp.name);
                  if (!exists) {
                    const data = {
                      name: imp.name,
                      tags:
                        imp.tags ||
                        (Array.isArray(imp.tags)
                          ? imp.tags
                          : typeof imp.tags === "string"
                          ? imp.tags.split(",").map((t) => t.trim())
                          : []),
                      params: imp.params || "",
                      probability: imp.probability ?? 100,
                      maxRepeats: imp.maxRepeats ?? 1,
                      allowedMeals: imp.allowedMeals || [
                        "śniadanie",
                        "obiad",
                        "kolacja",
                      ],
                      rating: imp.rating ?? 0,
                      favorite: !!imp.favorite,
                      ingredients: imp.ingredients || [],
                      color: imp.color || "",
                      maxAcrossWeeks: imp.maxAcrossWeeks ?? null,
                    };
                    addDish(data);
                  } else {
                    // merge some metadata if present
                    if (imp.rating != null) exists.rating = imp.rating;
                    if (imp.favorite != null) exists.favorite = !!imp.favorite;
                    if (imp.color) exists.color = imp.color;
                    if (imp.tags)
                      exists.tags = Array.isArray(imp.tags)
                        ? imp.tags
                        : ("" + imp.tags)
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean);
                  }
                });
              } else {
                // brak szczegółów -> dodaj minimalne potrawy po samych nazwach
                dishesArray.forEach((dn) => {
                  const allNow = dishesAll();
                  if (!allNow.find((d) => d.name === dn)) {
                    addDish({ name: dn });
                  }
                });
              }

              // zapisz i powiadom komponenty, że lista potraw się zmieniła
              // ensure storage reflects current master list and notify listeners
              try {
                const current = dishesAll();
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
            } catch (err) {
              console.warn("Błąd podczas dodawania potraw z importu:", err);
            }
            // nie próbujemy aktualizować komponentu Listy — odświeży się przy remoncie/ponownym wejściu
          }
        } catch (err) {
          console.warn("Nie udało się utworzyć listy potraw z importu:", err);
        }
        // --- koniec tworzenia listy potraw ---

        saveAll(next);
        Swal.fire({
          icon: "success",
          title: "Zaimportowano",
          text: `Zapisano jako "${name}"`,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Błąd importu",
          text: "Plik ma nieprawidłowy format",
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleLoadIntoPlanner = (item) => {
    // zapis jako "pending" — jeśli komponent Jadłospis jest odmontowany,
    // zostanie wczytany przy następnym jego mountcie; dodatkowo dispatchujemy event
    // dla przypadku, gdy jest zamontowany teraz.
    try {
      localStorage.setItem("pendingMenu", JSON.stringify(item.menu));
    } catch (err) {
      console.warn("Nie udało się zapisać pendingMenu", err);
    }
    window.dispatchEvent(
      new CustomEvent("loadSavedMenu", { detail: item.menu })
    );
    Swal.fire({
      icon: "success",
      title: "Załadowano",
      text: "Jeśli nie widzisz zmian, przejdź do sekcji Jadłospis — jadłospis będzie gotowy.",
      showConfirmButton: false,
      timer: 900,
    });
  };

  const handlePublish = async (item) => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Zaloguj się",
        text: "Musisz być zalogowany, żeby opublikować jadłospis.",
      });
      return;
    }
    try {
      // Guard: avoid publishing same menu multiple times (by exact menu JSON)
      const menuSignature = JSON.stringify(item.menu || []);
      const publishedMenusRaw = localStorage.getItem("publishedMenus") || "[]";
      const publishedMenus = JSON.parse(publishedMenusRaw || "[]");
      if (publishedMenus.includes(menuSignature)) {
        Swal.fire({
          icon: "info",
          title: "Już opublikowano",
          text: "Ten jadłospis został już wcześniej opublikowany.",
        });
        return;
      }

      const toExport = item.menu || [];
      const used = new Set();
      const placeholder = "Brak potraw";
      const flatDays = Array.isArray(toExport[0]) ? toExport.flat() : toExport;
      flatDays.forEach((entry) =>
        ["śniadanie", "obiad", "kolacja"].forEach((m) => {
          const d = entry?.[m];
          const name = d?.name ?? d;
          if (!name) return;
          if (name === placeholder) return;
          used.add(name);
        })
      );
      // dishesAll to funkcja -> wywołaj, aby dostać aktualną tablicę potraw
      const allForExport = dishesAll();
      const dishes = Array.from(used).map((n) => {
        const d = allForExport.find((x) => x.name === n);
        return (
          d || {
            name: n,
          }
        );
      });

      const res = await fetch(`${API}/api/public/menus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: item.name || `Jadłospis ${item.id}`,
          menu: item.menu,
          dishes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText || "Publish failed");
      }
      // remember published signature
      publishedMenus.push(menuSignature);
      localStorage.setItem("publishedMenus", JSON.stringify(publishedMenus));

      Swal.fire({
        icon: "success",
        title: "Opublikowano",
        text: "Jadłospis został opublikowany.",
      });
    } catch (err) {
      console.error("publish:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || "Nie udało się opublikować",
      });
    }
  };

  const handleExportClick = (event, item) => {
    setExportMenuAnchor(event.currentTarget);
    setSelectedItem(item);
  };

  const handleExportClose = () => {
    setExportMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleExportFormat = async (format) => {
    if (!selectedItem) return;

    try {
      switch (format) {
        case "json":
          handleExportOne(selectedItem);
          break;
        case "txt":
          exportToText(selectedItem.menu, selectedItem.name);
          break;
        case "png":
          await exportToImage(selectedItem.menu, selectedItem.name);
          break;
      }
      Swal.fire({
        icon: "success",
        title: "Wyeksportowano",
        showConfirmButton: false,
        timer: 900,
      });
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd eksportu",
        text: "Nie udało się wyeksportować jadłospisu",
      });
    } finally {
      handleExportClose();
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Zapisane jadłospisy
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          onClick={() => {
            // quick export all saved menus
            const blob = new Blob([JSON.stringify(saved, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `saved_jadlospisy_${new Date()
              .toISOString()
              .slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            Swal.fire({
              icon: "success",
              title: "Wyeksportowano wszystkie",
              showConfirmButton: false,
              timer: 900,
            });
          }}
        >
          Eksportuj wszystkie
        </Button>

        <Button
          variant="contained" // zmiana z outlined na contained
          startIcon={<UploadFileIcon />}
          onClick={() => fileRef.current?.click()}
        >
          Importuj jadłospis
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </Box>

      <Paper sx={{ p: 2 }}>
        {saved.length === 0 && (
          <Typography variant="body2">Brak zapisanych jadłospisów</Typography>
        )}
        <List>
          {saved.map((s) => (
            <ListItem
              key={s.id}
              sx={{
                flexDirection: {
                  xs: "column", // na małych ekranach układ pionowy
                  sm: "row", // na większych poziomy
                },
                alignItems: {
                  xs: "flex-start", // wyrównaj do lewej na małych ekranach
                  sm: "center", // wycentruj na większych
                },
                gap: { xs: 1 }, // odstęp między elementami w układzie pionowym
              }}
              secondaryAction={undefined} // usuń secondaryAction, przenosimy akcje do własnego kontenera
            >
              <ListItemText
                primary={s.name}
                secondary={new Date(s.createdAt).toLocaleString()}
                sx={{
                  mb: { xs: 1, sm: 0 }, // margines pod tekstem tylko na małych ekranach
                  width: "100%", // pełna szerokość na małych ekranach
                }}
              />

              {/* Kontener na ikony */}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  width: { xs: "100%", sm: "auto" }, // pełna szerokość na małych ekranach
                  justifyContent: { xs: "flex-start", sm: "flex-start" }, // wyrównanie ikon
                  ml: { xs: 0, sm: "auto" }, // auto margin tylko na większych ekranach
                }}
              >
                {/* Group 1: Load & Export actions */}
                <Box sx={{ display: "flex", mr: 0 }}>
                  <IconButton
                    onClick={() => handleLoadIntoPlanner(s)}
                    title="Załaduj do planera"
                    size="small"
                  >
                    <UploadIcon color="primary" />
                  </IconButton>
                  <IconButton
                    onClick={(e) => handleExportClick(e, s)}
                    title="Eksportuj jadłospis (JSON/TXT/PNG)"
                    size="small"
                  >
                    <FileDownloadIcon color="primary" />
                  </IconButton>
                </Box>

                {/* Group 2: Edit actions */}
                <Box sx={{ display: "flex", mr: 0 }}>
                  <IconButton
                    onClick={() => handleRename(s)}
                    title="Zmień nazwę jadłospisu"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handlePublish(s)}
                    title="Opublikuj jadłospis dla innych użytkowników"
                    size="small"
                  >
                    <PublicIcon />
                  </IconButton>
                </Box>

                {/* Group 3: Delete action */}
                <Box>
                  <IconButton
                    onClick={() => handleDelete(s.id)}
                    title="Usuń jadłospis"
                    size="small"
                    sx={{
                      "&:hover": {
                        bgcolor: "error.light",
                        "& .MuiSvgIcon-root": { color: "error.contrastText" },
                      },
                    }}
                  >
                    <DeleteIcon color="error" />
                  </IconButton>
                </Box>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={handleExportClose}
      >
        <MenuItem onClick={() => handleExportFormat("json")}>
          Eksportuj jako JSON
        </MenuItem>
        <MenuItem onClick={() => handleExportFormat("txt")}>
          Eksportuj jako tekst
        </MenuItem>
        <MenuItem onClick={() => handleExportFormat("png")}>
          Eksportuj jako obraz
        </MenuItem>
      </Menu>
    </Box>
  );
}
