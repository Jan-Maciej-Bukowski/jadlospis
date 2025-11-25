import React, { useEffect, useState, useRef } from "react";
import { ensureLocalDefault } from "../utils/storageHelpers";
import {
  Box,
  Button,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PublicIcon from "@mui/icons-material/Public";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";
import html2canvas from "html2canvas";
import GeneratedCalendar from "./jadlospis/generatedCalendar";

const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

const exportToImage = async (menu, name) => {
  const temp = document.createElement("div");
  temp.style.padding = "20px";
  temp.style.background = "white";
  temp.style.position = "absolute";
  temp.style.left = "-9999px";

  const title = document.createElement("h2");
  title.textContent = name;
  temp.appendChild(title);

  const content = document.createElement("div");
  const days = Array.isArray(menu[0]) ? menu.flat() : menu;
  days.forEach((day, i) => {
    const dayDiv = document.createElement("div");
    dayDiv.style.marginBottom = "15px";
    dayDiv.style.paddingBottom = "10px";
    dayDiv.style.borderBottom = "1px solid #ccc";

    let dayHTML = `<strong>Dzień ${i + 1} (${day.day || ""})</strong><br>`;

    // nowy format z times
    if (Array.isArray(day.times)) {
      day.times.forEach((t) => {
        const name = t.assigned?.name || t.assigned || "Brak";
        const start = t.startTime || t.start || "00:00";
        const end = t.endTime || t.end || "00:00";
        dayHTML += `${start} - ${end}: ${name}<br>`;
      });
    } else {
      // fallback: stary format
      dayHTML += `Śniadanie: ${
        day.śniadanie?.name || day.śniadanie || "Brak"
      }<br>`;
      dayHTML += `Obiad: ${day.obiad?.name || day.obiad || "Brak"}<br>`;
      dayHTML += `Kolacja: ${day.kolacja?.name || day.kolacja || "Brak"}<br>`;
    }

    dayDiv.innerHTML = dayHTML;
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
    text += `Dzień ${i + 1} (${day.day || ""})\n`;

    // nowy format z times
    if (Array.isArray(day.times)) {
      day.times.forEach((t) => {
        const dishName = t.assigned?.name || t.assigned || "Brak";
        const start = t.startTime || t.start || "00:00";
        const end = t.endTime || t.end || "00:00";
        text += `${start} - ${end}: ${dishName}\n`;
      });
    } else {
      // fallback: stary format
      text += `Śniadanie: ${day.śniadanie?.name || day.śniadanie || "Brak"}\n`;
      text += `Obiad: ${day.obiad?.name || day.obiad || "Brak"}\n`;
      text += `Kolacja: ${day.kolacja?.name || day.kolacja || "Brak"}\n`;
    }

    text += "\n";
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
  const [previewMenu, setPreviewMenu] = useState(null);
  const [previewStartDate, setPreviewStartDate] = useState(null);
  const [previewView, setPreviewView] = useState(null);
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const fileRef = useRef(null);

  // Load saved menus from localStorage
  useEffect(() => {
    ensureLocalDefault("savedMenus", []);
    const raw = localStorage.getItem("savedMenus");
    try {
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  }, []);

  // Load last viewed menu from localStorage (runs on every mount)
  useEffect(() => {
    const lastViewed = localStorage.getItem("lastViewedMenu");
    if (lastViewed) {
      try {
        const parsed = JSON.parse(lastViewed);
        // parsed zawiera: { id, name, menu, createdAt, startDate, view }
        setPreviewMenu(parsed); // zapisz cały obiekt, nie tylko menu
        setPreviewStartDate(
          parsed.startDate ? new Date(parsed.startDate) : new Date()
        );
        setPreviewView(parsed.view || "month");
      } catch (err) {
        console.warn("Błąd przy wczytywaniu lastViewedMenu:", err);
      }
    }
  }, []);

  // Save current preview state to localStorage (whenever it changes)
  useEffect(() => {
    if (previewMenu) {
      // previewMenu jest pełnym obiektem { id, name, menu, createdAt }
      localStorage.setItem(
        "lastViewedMenu",
        JSON.stringify({
          id: previewMenu.id,
          name: previewMenu.name,
          menu: previewMenu.menu,
          createdAt: previewMenu.createdAt,
          startDate: previewStartDate?.toISOString(),
          view: previewView,
        })
      );
    }
  }, [previewMenu, previewStartDate, previewView]);

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
    setPreviewMenu(null);
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
            try {
              window.dispatchEvent(
                new CustomEvent("dishListsUpdated", { detail: existing })
              );
            } catch (err) {
              console.warn("Nie udało się wysłać eventu dishListsUpdated", err);
            }

            try {
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
                      tags: imp.tags || [],
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
                dishesArray.forEach((dn) => {
                  const allNow = dishesAll();
                  if (!allNow.find((d) => d.name === dn)) {
                    addDish({ name: dn });
                  }
                });
              }

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
          }
        } catch (err) {
          console.warn("Nie udało się utworzyć listy potraw z importu:", err);
        }

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

  // open menu from list
  const handleSelectMenu = (item) => {
    setPreviewMenu(item); // item = { id, name, menu, createdAt, dateRangeStart, dateRangeEnd }
    // jeśli menu ma zapisaną datę rozpoczęcia, użyj jej; inaczej dzisiaj
    const startDate = item.dateRangeStart
      ? new Date(item.dateRangeStart)
      : new Date();
    setPreviewStartDate(startDate);
    setPreviewView("month");
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
      const allForExport = dishesAll();
      const dishes = Array.from(used).map((n) => {
        const d = allForExport.find((x) => x.name === n);
        return d || { name: n };
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
        Jadłospisy
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
          className="primary"
          onClick={() => {
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
          variant="contained"
          className="primary"
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
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                gap: { xs: 1 },
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
              }}
              onClick={() => handleSelectMenu(s)}
            >
              <ListItemText
                primary={s.name}
                secondary={new Date(s.createdAt).toLocaleString()}
                sx={{
                  mb: { xs: 1, sm: 0 },
                  width: "100%",
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  width: { xs: "100%", sm: "auto" },
                  justifyContent: { xs: "flex-start", sm: "flex-start" },
                  ml: { xs: 0, sm: "auto" },
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Box sx={{ display: "flex", mr: 0 }}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportClick(e, s);
                    }}
                    title="Eksportuj jadłospis (JSON/TXT/PNG)"
                    size="small"
                  >
                    <FileDownloadIcon color="primary" />
                  </IconButton>
                </Box>

                <Box sx={{ display: "flex", mr: 0 }}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(s);
                    }}
                    title="Zmień nazwę jadłospisu"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublish(s);
                    }}
                    title="Opublikuj jadłospis dla innych użytkowników"
                    size="small"
                  >
                    <PublicIcon />
                  </IconButton>
                </Box>

                <Box>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.id);
                    }}
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

      {/* Podgląd załadowanego jadłospisu w kalendarzu */}
      {previewMenu && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Jadłospis: {previewMenu.name || "bez nazwy"}
          </Typography>

          <GeneratedCalendar
            menu={previewMenu.menu}
            dateRangeStart={previewStartDate}
          />

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setPreviewMenu(null);
                setPreviewStartDate(null);
                setPreviewView(null);
                localStorage.removeItem("lastViewedMenu");
              }}
            >
              Zamknij podgląd
            </Button>
          </Box>
        </Paper>
      )}

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
