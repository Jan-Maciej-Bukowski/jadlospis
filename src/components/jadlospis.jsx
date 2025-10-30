import React, { useState, useRef, useEffect } from "react";
import { ensureLocalDefault } from "../utils/storageHelpers";
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
  Slider,
} from "@mui/material";
import { generateMenu } from "../js/generateMenu";
import { settings } from "../js/settings.js";
import { useTheme } from "@mui/material/styles";

// ensure storage keys (safe: does not use hooks)
ensureLocalDefault("dishes", []);
ensureLocalDefault("dishLists", []);
ensureLocalDefault("savedMenus", []);
ensureLocalDefault("lastMenu", null);

export default function Jadlospis() {
  // read available dishes from localStorage (live)
  const [dishesAll, setDishesAll] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dishes") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const h = () => {
      try {
        setDishesAll(JSON.parse(localStorage.getItem("dishes") || "[]"));
      } catch {
        setDishesAll([]);
      }
    };
    window.addEventListener("dishesUpdated", h);
    const storageHandler = (e) => {
      if (e.key === "dishes") h();
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("dishesUpdated", h);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

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
  // Zwiększony padding dla lepszego wyglądu
  const cellPadding = ui.compactTable ? "12px 16px" : "16px 20px";

  const daysOfWeek = [
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
    "Niedziela",
  ];

  const daysOfWeek_mobile = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Niedz"];

  // Zwraca tekst widoczny w pierwszej kolumnie (możesz ustawić daysOfWeek_mobile)
  const getVisualDay = (dayIndex, fallback) => {
    if (
      Array.isArray(daysOfWeek_mobile) &&
      daysOfWeek_mobile[dayIndex] &&
      isNarrow
    ) {
      return daysOfWeek_mobile[dayIndex];
    }
    return fallback ?? daysOfWeek[dayIndex] ?? "";
  };

  useEffect(() => {
    const raw = localStorage.getItem("dishLists");
    try {
      setAvailableLists(raw ? JSON.parse(raw) : []);
    } catch {
      setAvailableLists([]);
    }
  }, []);

  const getDishesForGeneration = () => {
    if (selectedListId === "all") return dishesAll;
    const arr = availableLists.find((l) => l.id === selectedListId);
    if (!arr) return [];
    // map names to dish objects from master list
    return arr.dishes
      .map((name) => dishesAll.find((d) => d.name === name))
      .filter(Boolean);
  };

  // Dodaj nową funkcję do sprawdzania dostępności potraw
  const checkDishesAvailability = (dishes) => {
    if (!Array.isArray(dishes) || dishes.length === 0) return false;

    // Policz potrawy dostępne dla każdej pory dnia
    const mealCounts = {
      śniadanie: 0,
      obiad: 0,
      kolacja: 0,
    };

    dishes.forEach((dish) => {
      const allowedMeals = dish.allowedMeals || [
        "śniadanie",
        "obiad",
        "kolacja",
      ];
      allowedMeals.forEach((meal) => {
        mealCounts[meal]++;
      });
    });

    // Progi ostrzeżeń - dostosuj według potrzeb
    const WARNING_THRESHOLDS = {
      śniadanie: 5,
      obiad: 5,
      kolacja: 5,
    };

    const warnings = Object.entries(mealCounts)
      .filter(([meal, count]) => count < WARNING_THRESHOLDS[meal])
      .map(
        ([meal, count]) =>
          `${meal}: ${count} ${
            count === 1 ? "potrawa" : "potrawy"
          } (zalecane min. ${WARNING_THRESHOLDS[meal]})`
      );

    return warnings;
  };

  const handleGenerateMenu = async () => {
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

    // Sprawdź dostępność potraw
    const warnings = checkDishesAvailability(source);
    if (warnings.length > 0) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Mało potraw!",
        html:
          `Masz bardzo mało potraw w wybranym źródle:<br><br>` +
          `${warnings.join("<br>")}<br><br>` +
          `W wygenerowanym jadłospisie może być dużo pustych miejsc (Brak potraw).<br>` +
          `Czy chcesz kontynuować?`,
        showCancelButton: true,
        confirmButtonText: "Generuj mimo to",
        cancelButtonText: "Anuluj",
        confirmButtonColor: "#ff9800",
      });

      if (!result.isConfirmed) return;
    }

    const generated = generateMenu(
      source,
      settings,
      daysOfWeek,
      weeksToGenerate
    );

    console.log(generated);

    // Sprawdź ile jest pustych miejsc w wygenerowanym jadłospisie
    const placeholder = settings.noDishText || "Brak potraw";
    const emptySlots = generated.flat().reduce((count, day) => {
      return (
        count +
        (day.śniadanie?.name === placeholder ? 1 : 0) +
        (day.obiad?.name === placeholder ? 1 : 0) +
        (day.kolacja?.name === placeholder ? 1 : 0)
      );
    }, 0);

    const totalSlots = generated.flat().length * 3;
    const emptyPercentage = Math.round((emptySlots / totalSlots) * 100);

    setMenu(generated);
    localStorage.setItem("lastMenu", JSON.stringify(generated));

    // Pokaż informację o wygenerowanym jadłospisie
    Swal.fire({
      title: "Jadłospis gotowy!",
      html:
        emptySlots > 0
          ? `Jadłospis został wygenerowany.<br><br>` +
            `<small>Uwaga: ${emptyPercentage}% miejsc jest pustych (${emptySlots} z ${totalSlots}).</small>`
          : "Twój nowy jadłospis został wygenerowany pomyślnie.",
      icon: emptySlots > totalSlots * 0.3 ? "warning" : "success",
      confirmButtonText: "OK",
      confirmButtonColor: emptySlots > totalSlots * 0.3 ? "#ff9800" : "#4CAF50",
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
    const newEntry = { id, name, menu, createdAt: new Date().toISOString() };
    saved.push(newEntry);
    localStorage.setItem("savedMenus", JSON.stringify(saved));
    Swal.fire({
      icon: "success",
      title: "Zapisano",
      text: `Jadłospis "${name}" zapisany.`,
    });

    // --- create new dish list from saved menu and add missing dishes to global dishes ---
    try {
      const placeholder = settings.noDishText || "Brak potraw";
      const flatDays = Array.isArray(menu[0]) ? menu.flat() : menu;
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
        // add new dish list
        const lists = JSON.parse(localStorage.getItem("dishLists") || "[]");
        const listId = `saved-${Date.now()}`;
        const listName = `Z ${name}`;
        lists.push({ id: listId, name: listName, dishes: dishesArray });
        localStorage.setItem("dishLists", JSON.stringify(lists));
        try {
          window.dispatchEvent(
            new CustomEvent("dishListsUpdated", { detail: lists })
          );
        } catch {}

        // ensure dishes exist in global dishes list
        const all = JSON.parse(localStorage.getItem("dishes") || "[]");
        let changed = false;
        dishesArray.forEach((dn) => {
          if (!all.find((x) => x.name === dn)) {
            all.push({ name: dn });
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem("dishes", JSON.stringify(all));
          try {
            window.dispatchEvent(
              new CustomEvent("dishesUpdated", { detail: all })
            );
          } catch {}
        }
      }
    } catch (err) {
      console.warn(
        "Nie udało się utworzyć listy potraw przy zapisie jadłospisu",
        err
      );
    }
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
      //window.__touchDrag = null;
      //document.body.style.touchAction = "";
    };
    //window.addEventListener("pagehide", cleanupGlobal);
    return () => {
      //window.removeEventListener("pagehide", cleanupGlobal);
      //cleanupGlobal();
    };
  }, []);

  const startTouchDragCell = (e, src) => {
    const t = e.touches && e.touches[0];
    if (!t) return;

    // Pozwól na naturalne scrollowanie, jeśli nie przeciągamy
    e.stopPropagation();

    window.__touchDrag = {
      payload: src,
      ghost: createGhost(typeof src === "string" ? src : src.meal || "potrawa"),
    };

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

  const sliderWeeks = [];

  function getSliderText(value) {
    return `tydzień ${value}`;
  }

  // Na początku komponentu dodaj ref do przechowywania referencji do tygodni
  const weekRefs = useRef([]);
  const theme = useTheme();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Dodaj funkcję do śledzenia scrollowania
  useEffect(() => {
    const handleScroll = () => {
      if (!weekRefs.current || !menu?.length || isAutoScrolling) return;

      const viewportMiddle = window.innerHeight / 2;
      let closest = { week: 1, distance: Infinity };

      weekRefs.current.forEach((ref, index) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        const distance = Math.abs(rect.top - 0); //viewportMiddle); gura, a nie środek ekranu!
        //console.log(`tydzień ${index + 1}: ${distance}`)
        if (distance < closest.distance) {
          closest = { week: index + 1, distance };
        }
      });

      setCurrentWeek(closest.week);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menu?.length, isAutoScrolling]);

  // Zmodyfikuj handleWeekChange aby ustawiał flagę
  const handleWeekChange = (_, value) => {
    setCurrentWeek(value);
    setIsAutoScrolling(true); // Ustaw flagę przed scrollowaniem

    const weekEl = weekRefs.current[value - 1];
    if (weekEl) {
      weekEl.scrollIntoView({ behavior: "smooth", block: "start" });

      // Reset flagi po zakończeniu scrollowania (po 1s)
      setTimeout(() => {
        setIsAutoScrolling(false);
      }, 1000);
    }
  };

  // Usuń style blokujące scrollowanie na telefonie
  useEffect(() => {
    return () => {
      // Upewnij się, że po odmontowaniu komponentu przywracamy możliwość scrollowania
      document.body.style.touchAction = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <Box sx={{ p: 3, display: "flex" }}>
      {/* Główna zawartość */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Jadłospis
        </Typography>

        {/* Przyciski i kontrolki */}
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
              onChange={(e) => {
                const val = e.target.value;
                // Pozwól na chwilowe czyszczenie pola
                if (val === "") {
                  setWeeksToGenerate("");
                } else {
                  setWeeksToGenerate(Number(val));
                }
              }}
              onBlur={() => {
                // Przy wyjściu z pola — popraw wartość, jeśli jest pusta lub < 1
                setWeeksToGenerate((prev) => Math.max(1, Number(prev) || 1));
              }}
              sx={{ width: 120 }}
              slotProps={{
                htmlInput: {
                  min: 1,
                },
              }}
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
            variant="contained"
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
                <Box
                  key={wi}
                  ref={(el) => (weekRefs.current[wi] = el)}
                  sx={{ scrollMargin: "20px" }} // dodaj margines dla lepszego scrollowania
                >
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Tydzień {wi + 1}
                  </Typography>
                  {/* Mobile view - vertical cards */}
                  {isNarrow ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      {week.map((entry, index) => (
                        <Box
                          key={index}
                          sx={{
                            border: "1px solid rgba(224, 224, 224, 0.6)",
                            borderRadius: "8px",
                            overflow: "hidden",
                            backgroundColor: "#fff",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                          }}
                        >
                          {/* Day header */}
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: "rgba(0, 0, 0, 0.04)",
                              fontWeight: 600,
                              fontSize: "1rem",
                              borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                            }}
                          >
                            {getVisualDay(index, entry.day)}
                          </Box>

                          {/* Meals stacked vertically */}
                          {["śniadanie", "obiad", "kolacja"].map(
                            (meal, mealIdx) => {
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
                              const dishColor =
                                dishObj?.color || dish?.color || "";
                              const cellStyle = dishColor
                                ? { backgroundColor: dishColor }
                                : {};

                              return (
                                <Box
                                  key={meal}
                                  sx={{
                                    p: 2,
                                    borderBottom:
                                      mealIdx < 2
                                        ? "1px solid rgba(224, 224, 224, 0.4)"
                                        : "none",
                                    ...cellStyle,
                                    transition: "all 0.2s ease",
                                    "&:active": {
                                      backgroundColor: cellStyle.backgroundColor
                                        ? cellStyle.backgroundColor
                                        : "rgba(0, 0, 0, 0.03)",
                                    },
                                  }}
                                  data-drop-week={wi}
                                  data-drop-dayindex={index}
                                  data-drop-meal={meal}
                                  onTouchStart={(e) =>
                                    startTouchDragCell(e, {
                                      week: wi,
                                      dayIndex: index,
                                      meal,
                                    })
                                  }
                                >
                                  {/* Meal label */}
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      fontWeight: 600,
                                      color: "rgba(0, 0, 0, 0.6)",
                                      mb: 1,
                                      textTransform: "uppercase",
                                      fontSize: "0.7rem",
                                      letterSpacing: "0.5px",
                                    }}
                                  >
                                    {meal}
                                  </Typography>

                                  {/* Dish content */}
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
                                        width: "100%",
                                      }}
                                    >
                                      <Box
                                        onTouchStart={(e) =>
                                          startTouchDragCell(e, {
                                            week: wi,
                                            dayIndex: index,
                                            meal,
                                          })
                                        }
                                        sx={{
                                          display: "inline-block",
                                          flex: 1,
                                          padding: "4px 8px",
                                          borderRadius: "6px",
                                          transition: "all 0.2s ease",
                                          "&:active": {
                                            backgroundColor:
                                              "rgba(0, 0, 0, 0.05)",
                                            transform: "scale(0.98)",
                                          },
                                        }}
                                      >
                                        <Box
                                          component="span"
                                          sx={{
                                            fontSize: "0.95rem",
                                            lineHeight: 1.4,
                                            fontWeight: 400,
                                          }}
                                        >
                                          {name}
                                        </Box>
                                      </Box>
                                      {favorite && ui.showFavoriteStar && (
                                        <FavoriteIcon
                                          color="error"
                                          sx={{ fontSize: 16 }}
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
                                              size="small"
                                              sx={{
                                                fontSize: "0.65rem",
                                                height: 22,
                                              }}
                                            />
                                          ))}
                                        </Box>
                                      )}
                                  </Box>
                                </Box>
                              );
                            }
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    /* Desktop view - table */
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: "100%",
                        overflowX: "auto",
                      }}
                    >
                      <Table
                        size={tableSize}
                        sx={{
                          minWidth: 0,
                          tableLayout: "fixed",
                          borderCollapse: "separate",
                          borderSpacing: 0,
                          "& .MuiTableCell-root": {
                            borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
                          },
                        }}
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
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                                width: "120px",
                                minWidth: "100px",
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
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
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
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
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
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                              }}
                            >
                              <strong>Kolacja</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {week.map((entry, index) => (
                            <TableRow
                              key={index}
                              sx={{
                                "&:hover": {
                                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                                },
                              }}
                            >
                              <TableCell
                                sx={{
                                  p: cellPadding,
                                  fontWeight: 500,
                                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                                  borderRight:
                                    "1px solid rgba(224, 224, 224, 0.4)",
                                  width: "120px",
                                  minWidth: "100px",
                                }}
                              >
                                {getVisualDay(index, entry.day)}
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
                                      maxWidth: {
                                        xs: 160,
                                        sm: 240,
                                        md: "auto",
                                      },
                                      minHeight: "80px",
                                      verticalAlign: "middle",
                                      transition: "all 0.2s ease",
                                      "&:hover": {
                                        backgroundColor:
                                          cellStyle.backgroundColor
                                            ? cellStyle.backgroundColor
                                            : "rgba(0, 0, 0, 0.03)",
                                        boxShadow:
                                          "inset 0 0 0 1px rgba(0, 0, 0, 0.08)",
                                      },
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
                                          alignItems: "flex-start",
                                          gap: 1,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {/* draggable handle */}
                                        <Box
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
                                          sx={{
                                            cursor: "grab",
                                            display: "inline-block",
                                            maxWidth: "100%",
                                            overflowWrap: "anywhere",
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            transition: "all 0.2s ease",
                                            "&:hover": {
                                              backgroundColor:
                                                "rgba(0, 0, 0, 0.05)",
                                            },
                                            "&:active": {
                                              cursor: "grabbing",
                                              transform: "scale(0.98)",
                                            },
                                          }}
                                        >
                                          <Box
                                            component="span"
                                            sx={{
                                              fontSize: isNarrow
                                                ? "0.9rem"
                                                : "1.05rem",
                                              lineHeight: 1.4,
                                              fontWeight: 400,
                                            }}
                                          >
                                            {name}
                                          </Box>
                                        </Box>
                                        {favorite && ui.showFavoriteStar && (
                                          <FavoriteIcon
                                            color="error"
                                            sx={{
                                              fontSize: isNarrow ? 14 : 18,
                                              flexShrink: 0,
                                            }}
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
                                              sx={{ flexShrink: 0 }}
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
                                                  height: isNarrow
                                                    ? 22
                                                    : undefined,
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
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            // legacy single-week array
            <>
              {isNarrow ? (
                /* Mobile view - vertical cards for single week */
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {menu.map((entry, index) => (
                    <Box
                      key={index}
                      sx={{
                        border: "1px solid rgba(255, 0, 0, 0.6)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "#fff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* Day header */}
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          fontWeight: 600,
                          fontSize: "1rem",
                          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        {getVisualDay(index, entry.day)}
                      </Box>

                      {/* Meals stacked vertically */}
                      {["śniadanie", "obiad", "kolacja"].map(
                        (meal, mealIdx) => {
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
                          const dishColor = dishObj?.color || dish?.color || "";
                          const cellStyle = dishColor
                            ? { backgroundColor: dishColor }
                            : {};

                          return (
                            <Box
                              key={meal}
                              sx={{
                                p: 2,
                                borderBottom:
                                  mealIdx < 2
                                    ? "1px solid rgba(224, 224, 224, 0.4)"
                                    : "none",
                                ...cellStyle,
                                transition: "all 0.2s ease",
                                "&:active": {
                                  backgroundColor: cellStyle.backgroundColor
                                    ? cellStyle.backgroundColor
                                    : "rgba(0, 0, 0, 0.03)",
                                },
                              }}
                              data-drop-week={0}
                              data-drop-dayindex={index}
                              data-drop-meal={meal}
                              onTouchStart={(e) =>
                                startTouchDragCell(e, {
                                  week: 0,
                                  dayIndex: index,
                                  meal,
                                })
                              }
                            >
                              {/* Meal label */}
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  fontWeight: 600,
                                  color: "rgba(0, 0, 0, 0.6)",
                                  mb: 1,
                                  textTransform: "uppercase",
                                  fontSize: "0.7rem",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {meal}
                              </Typography>

                              {/* Dish content */}
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
                                    width: "100%",
                                  }}
                                >
                                  <Box
                                    onTouchStart={(e) =>
                                      startTouchDragCell(e, {
                                        week: 0,
                                        dayIndex: index,
                                        meal,
                                      })
                                    }
                                    sx={{
                                      display: "inline-block",
                                      flex: 1,
                                      padding: "4px 8px",
                                      borderRadius: "6px",
                                      transition: "all 0.2s ease",
                                      "&:active": {
                                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                                        transform: "scale(0.98)",
                                      },
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{
                                        fontSize: "0.95rem",
                                        lineHeight: 1.4,
                                        fontWeight: 400,
                                      }}
                                    >
                                      {name}
                                    </Box>
                                  </Box>
                                  {favorite && ui.showFavoriteStar && (
                                    <FavoriteIcon
                                      color="error"
                                      sx={{ fontSize: 16 }}
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
                                          size="small"
                                          sx={{
                                            fontSize: "0.65rem",
                                            height: 22,
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                              </Box>
                            </Box>
                          );
                        }
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                /* Desktop view - table for single week */
                <Table
                  size={tableSize}
                  sx={{
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    "& .MuiTableCell-root": {
                      borderBottom: "1px solid rgba(224, 224, 224, 0.4)",
                    },
                  }}
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
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                          width: "120px",
                          minWidth: "100px",
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
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
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
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
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
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          borderBottom: "2px solid rgba(0, 0, 0, 0.12)",
                        }}
                      >
                        <strong>Kolacja</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {menu.map((entry, index) => {
                      return (
                        <TableRow
                          key={index}
                          sx={{
                            "&:hover": {
                              backgroundColor: "rgba(0, 0, 0, 0.02)",
                            },
                          }}
                        >
                          <TableCell
                            sx={{
                              p: cellPadding,
                              fontWeight: 500,
                              backgroundColor: "rgba(0, 0, 0, 0.02)",
                              borderRight: "1px solid rgba(224, 224, 224, 0.4)",
                              width: "120px",
                              minWidth: "100px",
                            }}
                          >
                            {getVisualDay(index, entry.day)}
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
                                  minHeight: "80px",
                                  verticalAlign: "middle",
                                  transition: "all 0.2s ease",
                                  "&:hover": {
                                    backgroundColor: cellStyle.backgroundColor
                                      ? cellStyle.backgroundColor
                                      : "rgba(0, 0, 0, 0.03)",
                                    boxShadow:
                                      "inset 0 0 0 1px rgba(0, 0, 0, 0.08)",
                                  },
                                }}
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
                                      alignItems: "flex-start",
                                      gap: 1,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <Box
                                      component="span"
                                      sx={{
                                        fontSize: isNarrow
                                          ? "0.9rem"
                                          : "1.05rem",
                                        fontWeight: 400,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {name}
                                    </Box>
                                    {favorite && ui.showFavoriteStar && (
                                      <FavoriteIcon
                                        sx={{
                                          fontSize: isNarrow ? 1 : 18,
                                          flexShrink: 0,
                                        }}
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
                                          sx={{ flexShrink: 0 }}
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
              )}
            </>
          ))}
      </Box>

      {/* Slider po prawej stronie */}
      {menu &&
        menu.length > 1 && ( // Dodaj warunek menu && menu.length > 1
          <Box
            sx={{
              width: 100,
              ml: 2,
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              alignItems: "center",
              pt: 8,
            }}
          >
            <Slider
              value={currentWeek}
              onChange={handleWeekChange}
              min={1}
              max={menu?.length || 1} // Dodaj fallback do max
              step={1}
              marks={
                menu
                  ? Array.from({ length: menu.length }, (_, i) => ({
                      value: i + 1,
                      label: `Tydz. ${i + 1}`,
                    }))
                  : []
              }
              track={false}
              orientation="vertical"
              sx={{
                height: "30%",
                position: "fixed",
                "& .MuiSlider-mark": {
                  width: 4,
                  height: 4,
                  backgroundColor: "primary.main",
                  borderRadius: "50%",
                },
                "& .MuiSlider-markLabel": {
                  fontSize: "0.75rem",
                  marginLeft: "10px",
                },
                "& .MuiSlider-rail": {
                  backgroundColor: "grey.300",
                  width: 4,
                  borderRadius: 2,
                },
                "& .MuiSlider-thumb": {
                  width: 24,
                  height: 24,
                  backgroundColor: "primary.main",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 8px rgba(25, 118, 210, 0.16)",
                  },
                },
                "& .MuiSlider-valueLabel": {
                  backgroundColor: "primary.main",
                },
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `Tydzień ${value}`}
            />
          </Box>
        )}
    </Box>
  );
}
