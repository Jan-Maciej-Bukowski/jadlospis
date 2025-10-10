import React, { useState, useRef, useEffect } from "react";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { Rating, Chip, useMediaQuery } from "@mui/material";
import Swal from "sweetalert2";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TextField,
} from "@mui/material";
import dishesAll from "../js/potrawy";
import { generateMenu } from "../js/generateMenu";
import { settings } from "../js/settings.js";

export default function Jadlospis() {
  // menu może być:
  // - null
  // - legacy: single week array [{day, śniadanie, obiad, kolacja}, ...]
  // - multiweek: array of weeks: [ week0Array, week1Array, ... ]
  const [menu, setMenu] = useState(
    JSON.parse(localStorage.getItem("lastMenu")) || null
  );
  const [weeksToGenerate, setWeeksToGenerate] = useState(1);
  const [selectedListId, setSelectedListId] = useState("all");
  const [availableLists, setAvailableLists] = useState([]);

  const ui = settings.ui || {};
  // wykrywanie wąskich ekranów (<768px)
  const isNarrow = useMediaQuery("(max-width:768px)");
  const tableSize = ui.compactTable ? "small" : "medium";
  const cellPadding = ui.compactTable ? "6px 8px" : undefined;

  const daysOfWeek = [
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
    "Niedziela",
  ];

  useEffect(() => {
    const raw = localStorage.getItem("dishLists");
    try {
      setAvailableLists(raw ? JSON.parse(raw) : []);
    } catch {
      setAvailableLists([]);
    }
  }, []);

  //
  const getDishesForGeneration = () => {
    if (selectedListId === "all") return dishesAll;
    const arr = availableLists.find((l) => l.id === selectedListId);
    if (!arr) return [];
    // map names to dish objects from master list
    return arr.dishes
      .map((name) => dishesAll.find((d) => d.name === name))
      .filter(Boolean);
  };

  const handleGenerateMenu = () => {
    const source = getDishesForGeneration();
    if (!Array.isArray(source) || source.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Brak potraw w źródle",
        text: "Wybrana lista nie zawiera żadnych potraw. Wybierz inną listę lub dodaj potrawy.",
        confirmButtonText: "OK",
      });
      return;
    }
    const generated = generateMenu(
      source,
      settings,
      daysOfWeek,
      weeksToGenerate
    );
    // generated is array of weeks
    setMenu(generated);
    localStorage.setItem("lastMenu", JSON.stringify(generated));
    Swal.fire({
      title: "Jadłospis gotowy!",
      text: "Twój nowy jadłospis został wygenerowany pomyślnie.",
      icon: "success",
      confirmButtonText: "Super!",
      confirmButtonColor: "#4CAF50",
      background: "#fefefe",
      color: "#333",
    });
  };

  // SAVE/LOAD saved menus via localStorage and cross-component event
  useEffect(() => {
    const onLoad = (ev) => {
      const importedMenu = ev.detail;
      if (!importedMenu) return;
      setMenu(importedMenu);
      localStorage.setItem("lastMenu", JSON.stringify(importedMenu));
      Swal.fire({
        icon: "success",
        title: "Załadowano jadłospis",
        showConfirmButton: false,
        timer: 900,
      });
    };
    window.addEventListener("loadSavedMenu", onLoad);

    // jeśli ktoś zapisał pendingMenu (np. z innej sekcji), wczytaj je przy mountcie
    try {
      const pendingRaw = localStorage.getItem("pendingMenu");
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending && Array.isArray(pending)) {
          setMenu(pending);
          localStorage.setItem("lastMenu", JSON.stringify(pending));
          localStorage.removeItem("pendingMenu");
          Swal.fire({
            icon: "success",
            title: "Załadowano jadłospis",
            showConfirmButton: false,
            timer: 900,
          });
        }
      }
    } catch (err) {
      console.warn("Nie udało się wczytać pendingMenu", err);
    }

    return () => window.removeEventListener("loadSavedMenu", onLoad);
  }, []);

  const handleSaveCurrentMenu = async () => {
    if (!menu) {
      Swal.fire({
        icon: "warning",
        title: "Brak wygenerowanego jadłospisu",
        text: "Najpierw wygeneruj jadłospis.",
      });
      return;
    }
    const { value: name } = await Swal.fire({
      title: "Zapisz jadłospis",
      input: "text",
      inputLabel: "Nazwa jadłospisu",
      inputPlaceholder: "np. Tydzień 2025-10-10",
      showCancelButton: true,
    });
    if (!name) return;
    const saved = JSON.parse(localStorage.getItem("savedMenus") || "[]");
    const id = Date.now().toString();
    saved.push({ id, name, menu, createdAt: new Date().toISOString() });
    localStorage.setItem("savedMenus", JSON.stringify(saved));
    Swal.fire({
      icon: "success",
      title: "Zapisano",
      text: `Jadłospis "${name}" zapisany.`,
    });
  };

  const handleExport = () => {
    const toExportMenu =
      menu || JSON.parse(localStorage.getItem("lastMenu")) || [];
    // collect unique full dish objects used in menu
    const usedNames = new Set();
    // placeholder used for "no dish" should NOT be exported as a dish
    const placeholder = settings.noDishText || "Brak potraw";

    // support multi-week (array of weeks) and single-week (array of days)
    const flatDays = Array.isArray(toExportMenu[0])
      ? toExportMenu.flat()
      : toExportMenu;
    flatDays.forEach((entry) =>
      ["śniadanie", "obiad", "kolacja"].forEach((m) => {
        const d = entry?.[m];
        const name = d?.name ?? d;
        if (!name) return;
        // ignore placeholder/no-dish text
        if (name === placeholder) return;
        if (name) usedNames.add(name);
      })
    );
    const exportDishes = Array.from(usedNames).map((name) => {
      const d = dishesAll.find((x) => x.name === name);
      return d
        ? {
            name: d.name,
            tags: d.tags || [],
            params: d.params || "",
            probability: d.probability ?? 100,
            maxRepeats: d.maxRepeats ?? 1,
            allowedMeals: d.allowedMeals || ["śniadanie", "obiad", "kolacja"],
            rating: d.rating ?? 0,
            favorite: !!d.favorite,
            ingredients: d.ingredients || [],
            color: d.color || "",
            maxAcrossWeeks: d.maxAcrossWeeks ?? null,
          }
        : { name };
    });

    // include full settings so import restores UI and generation settings
    const exportSettings = {
      excludedTags: settings.excludedTags,
      specialDishes: settings.specialDishes,
      ui: settings.ui,
      noDishText: settings.noDishText, // <-- include custom placeholder
    };

    // include saved lists of dishes (if any)
    const storedLists = JSON.parse(localStorage.getItem("dishLists") || "[]");

    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        source: "jadlospis",
      },
      settings: exportSettings,
      menu: toExportMenu,
      dishes: exportDishes,
      lists: storedLists, // <-- exported lists of dishes
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jadlospis_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    Swal.fire({
      title: "Wyeksportowano",
      text: "Jadłospis został pobrany w formacie JSON.",
      icon: "success",
      confirmButtonText: "OK",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);

        // expected new format: { settings: {...}, menu: [...], dishes: [...] }
        // support legacy: array -> menu only
        let importedMenu = null;
        let importedDishes = [];
        let importedSettings = null;

        if (Array.isArray(parsed)) {
          // legacy: either single-week array (days) or multi-week array (weeks)
          // detect: if first element is an array -> multi-week
          if (Array.isArray(parsed[0])) {
            importedMenu = parsed; // multi-week
          } else {
            importedMenu = parsed; // single-week
          }
        } else if (parsed && parsed.menu) {
          importedMenu = parsed.menu;
          if (Array.isArray(parsed.dishes)) importedDishes = parsed.dishes;
          if (parsed.settings) importedSettings = parsed.settings;
          // also support lists exported as `lists` or `dishLists`
          if (Array.isArray(parsed.lists) || Array.isArray(parsed.dishLists)) {
            const importedLists = parsed.lists || parsed.dishLists;
            localStorage.setItem("dishLists", JSON.stringify(importedLists));
            setAvailableLists(importedLists);
          }
        } else {
          throw new Error("Nieprawidłym formacie pliku");
        }

        // Validate minimal menu structure:
        // - single-week: array of day objects with day property
        // - multi-week: array of weeks, each week is array of day objects
        const isMultiWeek = Array.isArray(importedMenu[0]);
        const valid =
          Array.isArray(importedMenu) &&
          (isMultiWeek
            ? importedMenu.every(
                (week) =>
                  Array.isArray(week) &&
                  week.every((row) => row && typeof row.day === "string")
              )
            : importedMenu.every((row) => row && typeof row.day === "string"));
        if (!valid) throw new Error("Nieprawidłowa struktura menu");

        // If settings present in file, apply them now (and persist to localStorage)
        if (importedSettings) {
          if (importedSettings.excludedTags) {
            settings.excludedTags = importedSettings.excludedTags;
            localStorage.setItem(
              "excludedTags",
              JSON.stringify(importedSettings.excludedTags)
            );
          }
          if (importedSettings.specialDishes) {
            settings.specialDishes = importedSettings.specialDishes;
            localStorage.setItem(
              "specialDishes",
              JSON.stringify(importedSettings.specialDishes)
            );
          }
          if (importedSettings.ui) {
            settings.ui = importedSettings.ui;
            localStorage.setItem(
              "uiSettings",
              JSON.stringify(importedSettings.ui)
            );
          }
          // apply custom no-dish text from file (important to do before extracting dishes)
          if (importedSettings.noDishText != null) {
            settings.noDishText = importedSettings.noDishText;
            localStorage.setItem("noDishText", importedSettings.noDishText);
          }
        }

        // also accept lists placed under top-level `lists` or `dishLists` inside parsed.settings
        if (
          importedSettings &&
          (importedSettings.lists || importedSettings.dishLists)
        ) {
          const importedLists =
            importedSettings.lists || importedSettings.dishLists;
          localStorage.setItem("dishLists", JSON.stringify(importedLists));
          setAvailableLists(importedLists);
        }

        // If no explicit parsed.dishes provided, also try to extract dish objects embedded in menu
        if ((!importedDishes || importedDishes.length === 0) && importedMenu) {
          const extracted = [];
          const currentPlaceholder = settings.noDishText || "Brak potraw";
          if (Array.isArray(importedMenu[0])) {
            {
              // multi-week
              importedMenu.forEach((week) =>
                week.forEach((day) =>
                  ["śniadanie", "obiad", "kolacja"].forEach((m) => {
                    const d = day?.[m];
                    if (
                      d &&
                      typeof d === "object" &&
                      d.name &&
                      d.name !== currentPlaceholder
                    ) {
                      extracted.push(d);
                    }
                  })
                )
              );
            }
          } else {
            // single-week
            importedMenu.forEach((day) =>
              ["śniadanie", "obiad", "kolacja"].forEach((m) => {
                const d = day?.[m];
                if (
                  d &&
                  typeof d === "object" &&
                  d.name &&
                  d.name !== currentPlaceholder
                )
                  extracted.push(d);
              })
            );
          }
          if (extracted.length) importedDishes = extracted;
        }

        // Add imported dish metadata to local dishes if missing; also merge rating/favorite/color
        importedDishes.forEach((imp) => {
          if (!imp || !imp.name) return;
          // don't add the placeholder as a dish
          if (imp.name === (settings.noDishText || "Brak potraw")) return;
          const exists = dishesAll.find((d) => d.name === imp.name);
          if (!exists) {
            const data = {
              name: imp.name,
              tags:
                imp.tags ||
                (Array.isArray(imp.tags) ? imp.tags.join(", ") : "") ||
                "",
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
            try {
              addDish(data);
            } catch (err) {
              console.warn(
                "Import: nie udało się dodać potrawy",
                imp.name,
                err
              );
            }
          } else {
            // merge provided meta
            if (imp.rating != null) exists.rating = imp.rating;
            if (imp.favorite != null) exists.favorite = !!imp.favorite;
            if (imp.color != null) exists.color = imp.color;
            if (imp.maxRepeats != null) exists.maxRepeats = imp.maxRepeats;
            if (imp.maxAcrossWeeks != null)
              exists.maxAcrossWeeks = imp.maxAcrossWeeks;
            if (imp.tags)
              exists.tags = Array.isArray(imp.tags)
                ? imp.tags
                : ("" + imp.tags)
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
          }
        });

        // set menu and persist lastMenu
        setMenu(importedMenu);
        localStorage.setItem("lastMenu", JSON.stringify(importedMenu));

        Swal.fire({
          title: "Zaimportowano",
          text: "Jadłospis, potrawy i ustawienia zostały zaimportowane pomyślnie.",
          icon: "success",
          confirmButtonText: "OK",
        });
      } catch (err) {
        Swal.fire({
          title: "Błąd importu",
          text: "Plik JSON ma niewłaściwy format.",
          icon: "error",
          confirmButtonText: "OK",
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Drag & drop handlers (support single-week and multi-week menus)
  const handleDragStart = (e, src) => {
    // src = { week: number|null, dayIndex: number, meal: "śniadanie"|"obiad"|"kolacja" }
    e.dataTransfer.setData("application/json", JSON.stringify(src));
    e.dataTransfer.effectAllowed = "move";
    // ukryj domyślny podgląd przeciągania - ustaw 1x1 transparentny obraz
    try {
      const img = new Image();
      img.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XqzXQAAAAASUVORK5CYII=";
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch (err) {
      // ignore if setDragImage not supported
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // allow drop
  };

  // helper: swap/move dish between slots (supports single-week and multi-week menu)
  const moveDish = (src, dest) => {
    const current = JSON.parse(
      JSON.stringify(menu || JSON.parse(localStorage.getItem("lastMenu")) || [])
    );
    if (!Array.isArray(current) || current.length === 0) return;
    const isMulti = Array.isArray(current[0]);

    const sWeek = isMulti ? src.week ?? 0 : 0;
    const dWeek = isMulti ? dest.week ?? 0 : 0;
    const sDay = src.dayIndex;
    const dDay = dest.dayIndex;
    const sMeal = src.meal;
    const dMeal = dest.meal;

    // noop when same slot
    if (sWeek === dWeek && sDay === dDay && sMeal === dMeal) return;

    // swap values
    if (isMulti) {
      const temp = current[dWeek][dDay][dMeal];
      current[dWeek][dDay][dMeal] = current[sWeek][sDay][sMeal];
      current[sWeek][sDay][sMeal] = temp;
    } else {
      const temp = current[dDay][dMeal];
      current[dDay][dMeal] = current[sDay][sMeal];
      current[sDay][sMeal] = temp;
    }

    setMenu(current);
    localStorage.setItem("lastMenu", JSON.stringify(current));
  };

  const handleDrop = (e, dest) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const src = JSON.parse(raw);
      moveDish(src, dest);
    } catch (err) {
      // ignore bad payloads but log for debug
      console.warn("handleDrop parse error:", err);
    }
  };

  // touch-dnd helpers for moving dishes on touch devices
  const createGhost = (label) => {
    // create an invisible ghost (no visible text, transparent colors)
    const g = document.createElement("div");
    // keep payload in dataset for debugging if needed, but do not show it
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
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
    return g;
  };

  // ensure any leftover ghost is removed on unmount / pagehide
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

  const startTouchDragCell = (e, src) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.touchAction = "none";

    window.__touchDrag = {
      payload: src,
      ghost: createGhost(typeof src === "string" ? src : src.meal || "potrawa"),
    };

    console.log(__touchDrag);

    window.__touchDrag.ghost.style.top = t.clientY + 6 + "px";
    window.__touchDrag.ghost.style.left = t.clientX + 6 + "px";

    const cleanup = () => {
      try {
        if (window.__touchDrag?.ghost) window.__touchDrag.ghost.remove();
      } catch (err) {}
      window.__touchDrag = null;
      document.body.style.touchAction = prevTouchAction || "";
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
      if (ev.cancelable) ev.preventDefault();
    };

    const onEnd = (ev) => {
      const last = ev.changedTouches && ev.changedTouches[0];
      if (last && window.__touchDrag) {
        const el = document.elementFromPoint(last.clientX, last.clientY);
        const slotEl = el && el.closest && el.closest("[data-drop-week]");
        if (slotEl) {
          const dest = {
            week: Number(slotEl.dataset.dropWeek),
            dayIndex: Number(slotEl.dataset.dropDayindex),
            meal: slotEl.dataset.dropMeal,
          };
          if (typeof window.__touchDrag.payload === "object") {
            moveDish(window.__touchDrag.payload, dest);
          } else {
            const current = JSON.parse(
              JSON.stringify(
                menu || JSON.parse(localStorage.getItem("lastMenu")) || []
              )
            );
            const isMulti = Array.isArray(current[0]);
            const placeholderObj = {
              name: window.__touchDrag.payload,
              favorite: false,
            };
            if (isMulti)
              current[dest.week][dest.dayIndex][dest.meal] = placeholderObj;
            else current[dest.dayIndex][dest.meal] = placeholderObj;
            setMenu(current);
            localStorage.setItem("lastMenu", JSON.stringify(current));
          }
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

  const transparentDragImage = (() => {
    const img = new Image();
    img.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6XqzXQAAAAASUVORK5CYII=";
    return img;
  })();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Jadłospis
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
        <TextField
          select
          SelectProps={{ native: true }}
          label="Źródło potraw"
          value={selectedListId}
          onChange={(e) => setSelectedListId(e.target.value)}
          size="small"
        >
          <option value="all">Wszystkie potrawy</option>
          {availableLists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.dishes.length})
            </option>
          ))}
        </TextField>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            label="Ile tygodni?"
            type="number"
            size="small"
            value={weeksToGenerate}
            onChange={(e) =>
              setWeeksToGenerate(Math.max(1, Number(e.target.value) || 1))
            }
            sx={{ width: 120 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateMenu}
          >
            Generuj jadłospis
          </Button>
        </Box>

        <Button
          variant="outlined"
          color="primary"
          onClick={handleSaveCurrentMenu}
        >
          Zapisz jadłospis
        </Button>
      </Box>

      {menu &&
        Array.isArray(menu) &&
        menu.length > 0 &&
        // detect multi-week: if first element is an array -> multiweek
        (Array.isArray(menu[0]) ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {menu.map((week, wi) => (
              <Box key={wi}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Tydzień {wi + 1}
                </Typography>
                <Box
                  sx={{ width: "100%", maxWidth: "100%", overflowX: "auto" }}
                >
                  <Table
                    size={tableSize}
                    sx={{ minWidth: 0, tableLayout: "fixed" }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          draggable={false}
                          onDragStart={(e) => {
                            // uniemożliwiamy domyślny preview/drag nagłówka
                            try {
                              e.dataTransfer.setDragImage(
                                transparentDragImage,
                                0,
                                0
                              );
                            } catch (err) {}
                            if (e.preventDefault) e.preventDefault();
                          }}
                          sx={{
                            p: cellPadding,
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitUserDrag: "none",
                            touchAction: "manipulation",
                          }}
                        >
                          <strong>Dzień tygodnia</strong>
                        </TableCell>

                        <TableCell
                          draggable={false}
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setDragImage(
                                transparentDragImage,
                                0,
                                0
                              );
                            } catch (err) {}
                            if (e.preventDefault) e.preventDefault();
                          }}
                          sx={{
                            p: cellPadding,
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitUserDrag: "none",
                            touchAction: "manipulation",
                          }}
                        >
                          <strong>Śniadanie</strong>
                        </TableCell>

                        <TableCell
                          draggable={false}
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setDragImage(
                                transparentDragImage,
                                0,
                                0
                              );
                            } catch (err) {}
                            if (e.preventDefault) e.preventDefault();
                          }}
                          sx={{
                            p: cellPadding,
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitUserDrag: "none",
                            touchAction: "manipulation",
                          }}
                        >
                          <strong>Obiad</strong>
                        </TableCell>

                        <TableCell
                          draggable={false}
                          onDragStart={(e) => {
                            try {
                              e.dataTransfer.setDragImage(
                                transparentDragImage,
                                0,
                                0
                              );
                            } catch (err) {}
                            if (e.preventDefault) e.preventDefault();
                          }}
                          sx={{
                            p: cellPadding,
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            WebkitUserDrag: "none",
                            touchAction: "manipulation",
                          }}
                        >
                          <strong>Kolacja</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {week.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ p: cellPadding }}>
                            {entry.day}
                          </TableCell>
                          {["śniadanie", "obiad", "kolacja"].map((meal) => {
                            const dish = entry[meal];
                            const name =
                              dish?.name ??
                              dish ??
                              settings.noDishText ??
                              "Brak potraw";
                            const favorite = !!dish?.favorite;
                            const dishObj = dishesAll.find(
                              (d) => d.name === name
                            );
                            // safe: don't access dishObj.tags when dishObj is undefined
                            const dishColor =
                              dishObj?.color || dish?.color || "";
                            const cellStyle = dishColor
                              ? { backgroundColor: dishColor }
                              : {};
                            return (
                              <TableCell
                                key={meal}
                                sx={{
                                  p: cellPadding,
                                  ...cellStyle,
                                  // make cells able to wrap and not force horizontal scroll
                                  whiteSpace: "normal",
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  maxWidth: { xs: 160, sm: 240, md: "auto" },
                                }}
                                onDragOver={handleDragOver}
                                onDrop={(e) =>
                                  handleDrop(e, {
                                    week: wi,
                                    dayIndex: index,
                                    meal,
                                  })
                                }
                                data-drop-week={wi}
                                data-drop-dayindex={index}
                                data-drop-meal={meal}
                                // touch start for moving cell contents
                                onTouchStart={(e) =>
                                  startTouchDragCell(e, {
                                    week: wi,
                                    dayIndex: index,
                                    meal,
                                  })
                                }
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    {/* draggable handle */}
                                    <span
                                      draggable
                                      onDragStart={(e) =>
                                        handleDragStart(e, {
                                          week: wi,
                                          dayIndex: index,
                                          meal,
                                        })
                                      }
                                      onTouchStart={(e) =>
                                        startTouchDragCell(e, {
                                          week: wi,
                                          dayIndex: index,
                                          meal,
                                        })
                                      }
                                      style={{
                                        cursor: "grab",
                                        display: "inline-block",
                                        maxWidth: "100%",
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-block",
                                          fontSize: isNarrow
                                            ? "0.85rem"
                                            : "1rem",
                                          lineHeight: 1.1,
                                          maxWidth: "100%",
                                        }}
                                      >
                                        {name}
                                      </span>
                                    </span>
                                    {favorite && ui.showFavoriteStar && (
                                      <FavoriteIcon
                                        color="error"
                                        sx={{ fontSize: isNarrow ? 14 : 18 }}
                                      />
                                    )}
                                    {/* hide rating/opinie on narrow screens */}
                                    {!isNarrow &&
                                      ui.showRating &&
                                      dishObj?.rating != null && (
                                        <Rating
                                          value={dishObj.rating}
                                          size="small"
                                          readOnly
                                          precision={0.5}
                                          sx={{ ml: 1 }}
                                        />
                                      )}
                                  </Box>
                                  {ui.showTags &&
                                    Array.isArray(dishObj?.tags) &&
                                    dishObj.tags.length > 0 && (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          gap: isNarrow ? 0.25 : 0.5,
                                          flexWrap: "wrap",
                                          mt: 0.5,
                                        }}
                                      >
                                        {dishObj.tags.map((t, i) => (
                                          <Chip
                                            key={i}
                                            label={t}
                                            size={
                                              isNarrow
                                                ? "small"
                                                : ui.compactTable
                                                ? "small"
                                                : "medium"
                                            }
                                            sx={{
                                              fontSize: isNarrow
                                                ? "0.65rem"
                                                : undefined,
                                              height: isNarrow ? 22 : undefined,
                                            }}
                                          />
                                        ))}
                                      </Box>
                                    )}
                                </Box>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          // legacy single-week array
          <Table size={tableSize}>
            <TableHead>
              <TableRow>
                <TableCell
                  draggable={false}
                  onDragStart={(e) => {
                    // uniemożliwiamy domyślny preview/drag nagłówka
                    try {
                      e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                    } catch (err) {}
                    if (e.preventDefault) e.preventDefault();
                  }}
                  sx={{
                    p: cellPadding,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitUserDrag: "none",
                    touchAction: "manipulation",
                  }}
                >
                  <strong>Dzień tygodnia</strong>
                </TableCell>
                <TableCell
                  draggable={false}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                    } catch (err) {}
                    if (e.preventDefault) e.preventDefault();
                  }}
                  sx={{
                    p: cellPadding,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitUserDrag: "none",
                    touchAction: "manipulation",
                  }}
                >
                  <strong>Śniadanie</strong>
                </TableCell>
                <TableCell
                  draggable={false}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                    } catch (err) {}
                    if (e.preventDefault) e.preventDefault();
                  }}
                  sx={{
                    p: cellPadding,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitUserDrag: "none",
                    touchAction: "manipulation",
                  }}
                >
                  <strong>Obiad</strong>
                </TableCell>
                <TableCell
                  draggable={false}
                  onDragStart={(e) => {
                    try {
                      e.dataTransfer.setDragImage(transparentDragImage, 0, 0);
                    } catch (err) {}
                    if (e.preventDefault) e.preventDefault();
                  }}
                  sx={{
                    p: cellPadding,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitUserDrag: "none",
                    touchAction: "manipulation",
                  }}
                >
                  <strong>Kolacja</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menu.map((entry, index) => {
                return (
                  <TableRow key={index}>
                    <TableCell sx={{ p: cellPadding }}>{entry.day}</TableCell>
                    {["śniadanie", "obiad", "kolacja"].map((meal) => {
                      const dish = entry[meal];
                      const name =
                        dish?.name ??
                        dish ??
                        settings.noDishText ??
                        "Brak potraw";
                      const favorite = !!dish?.favorite;
                      const dishObj = dishesAll.find((d) => d.name === name);
                      const dishColor = dishObj?.color || dish?.color || "";
                      const cellStyle = dishColor
                        ? { backgroundColor: dishColor }
                        : {};
                      return (
                        <TableCell
                          key={meal}
                          sx={{ p: cellPadding, ...cellStyle }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              flexDirection: "column",
                              alignItems: "flex-start",
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: isNarrow ? "0.85rem" : "1rem",
                                }}
                              >
                                {name}
                              </span>
                              {favorite && ui.showFavoriteStar && (
                                <FavoriteIcon
                                  sx={{ fontSize: isNarrow ? 1 : 18 }}
                                  color="error"
                                />
                              )}
                              {!isNarrow &&
                                ui.showRating &&
                                dishObj?.rating != null && (
                                  <Rating
                                    value={dishObj.rating}
                                    size="small"
                                    readOnly
                                    precision={0.5}
                                    sx={{ ml: 1 }}
                                  />
                                )}
                            </Box>
                            {ui.showTags &&
                              Array.isArray(dishObj?.tags) &&
                              dishObj.tags.length > 0 && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.5,
                                    flexWrap: "wrap",
                                    mt: 0.5,
                                  }}
                                >
                                  {dishObj.tags.map((t, i) => (
                                    <Chip
                                      key={i}
                                      label={t}
                                      size={
                                        isNarrow
                                          ? "small"
                                          : ui.compactTable
                                          ? "small"
                                          : "medium"
                                      }
                                      sx={{
                                        fontSize: isNarrow
                                          ? "0.65rem"
                                          : undefined,
                                        height: isNarrow ? 22 : undefined,
                                      }}
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
        ))}
    </Box>
  );
}
