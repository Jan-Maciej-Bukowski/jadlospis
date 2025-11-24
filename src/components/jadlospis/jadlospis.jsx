import React, { useState, useRef, useEffect } from "react";
import { ensureLocalDefault } from "../../utils/storageHelpers.js";
import { useMediaQuery } from "@mui/material";
import Swal from "sweetalert2";
import { Box, Button, Typography, TextField } from "@mui/material";
import { generateMenu } from "../../js/generateMenu.js";
import { settings } from "../../js/settings.js";
import ListDishesConfig from "../ListDishesConfig.jsx";
import DesktopJadlospis from "./desktop.jsx";
import MobileJadlospis from "./mobile.jsx";
import DAYS from "../../utils/days.js";

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
  const [isGenerated, setIsGenerated] = useState(false);

  const ui = settings.ui || {};
  // wykrywanie wąskich ekranów (<768px)
  const isNarrow = useMediaQuery("(max-width:768px)");

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

  // temporary per-dish overrides for the currently selected source (only for generation)
  const [tempConfigs, setTempConfigs] = useState({});

  // helper: return base dishes for selected list (unchanged), used by other code
  const baseDishesForList = () => {
    return getDishesForGeneration(); // unchanged function above
  };

  // merged dishes: base dish objects merged with tempConfigs (do NOT persist)
  const mergedDishesForList = () => {
    const base = baseDishesForList();
    if (!Array.isArray(base) || base.length === 0) return [];

    return base
      .map((dish) => {
        if (!dish || !dish.name) return dish;

        const tempConfig = tempConfigs[dish.name];
        if (!tempConfig) return dish;

        return {
          ...dish,
          ...tempConfig,
        };
      })
      .filter(Boolean);
  };

  // when user edits per-dish config in the UI, update tempConfigs only
  const handleDishConfigChange = (dishName, updatedDish) => {
    setTempConfigs((prev) => ({
      ...prev,
      [dishName]: {
        ...prev[dishName], // zachowaj poprzednie ustawienia tej potrawy
        ...updatedDish, // nadpisz nowymi ustawieniami
      },
    }));
  };

  // use mergedDishesForList() when generating menu
  const handleGenerateMenu = async () => {
    const source = mergedDishesForList(); // Użyj merged dishes zamiast mapowania

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

    setIsGenerated(true);
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

    // wymuś kursor zaciśniętej dłoni oraz klasę na elemencie
    try {
      document.body.style.cursor = "grabbing";
      if (e.currentTarget && e.currentTarget.classList) {
        e.currentTarget.classList.add("grabbing");
      }
    } catch (err) {
      console.log(err)
    }
  };

  const handleDragEnd = (e) => {
    // przy zakończeniu przeciągania przywróć kursor/klasę
    try {
      document.body.style.cursor = "";
      if (e.currentTarget && e.currentTarget.classList) {
        e.currentTarget.classList.remove("grabbing");
      }
    } catch (err) {}
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

  const startTouchDragCell = (e, src) => {
    const t = e.touches && e.touches[0];
    if (!t) return;

    // Zachowaj poprzedni stan touchAction
    const prevTouchAction = document.body.style.touchAction;

    e.stopPropagation();

    window.__touchDrag = {
      payload: src,
      ghost: createGhost(typeof src === "string" ? src : src.meal || "potrawa"),
      prevTouchAction, // zapisz poprzedni stan
    };

    window.__touchDrag.ghost.style.top = t.clientY + 6 + "px";
    window.__touchDrag.ghost.style.left = t.clientX + 6 + "px";

    const cleanup = () => {
      try {
        if (window.__touchDrag?.ghost) window.__touchDrag.ghost.remove();
      } catch (err) {}
      window.__touchDrag = null;
      // Przywróć poprzedni stan touchAction
      document.body.style.touchAction =
        window.__touchDrag?.prevTouchAction || "";
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

  const weekRefs = useRef([]);

  // Usuń style blokujące scrollowanie na telefonie
  useEffect(() => {
    return () => {
      // Upewnij się, że po odmontowaniu komponentu przywracamy możliwość scrollowania
      document.body.style.touchAction = "";
      document.body.style.overflow = "";
    };
  }, []);

  // Najpierw dodaj useEffect, który będzie inicjalizował tempConfigs gdy zmienia się selectedListId
  useEffect(() => {
    if (selectedListId === "all") {
      setTempConfigs({});
      return;
    }

    const dishes = getDishesForGeneration();
    if (!Array.isArray(dishes) || dishes.length === 0) return;

    // Stwórz obiekt z domyślnymi wartościami dla każdej potrawy
    const initialConfigs = {};
    dishes.forEach((dish) => {
      if (!dish || !dish.name) return; // Upewnij się że dish jest poprawny

      initialConfigs[dish.name] = {
        allowedDays: dish.allowedDays || DAYS,
        maxRepeats: dish.maxRepeats || 1,
        maxAcrossWeeks: dish.maxAcrossWeeks || null,
        maxPerDay: dish.maxPerDay || null,
        allowedMeals: dish.allowedMeals || ["śniadanie", "obiad", "kolacja"],
      };
    });

    // Ustaw tylko jeśli są jakieś konfiguracje
    if (Object.keys(initialConfigs).length > 0) {
      setTempConfigs(initialConfigs);
    }
  }, [selectedListId]);

  return (
    <Box sx={{ p: 3, display: "flex" }}>
      {/* Główna zawartość */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h5"
          sx={{ mb: 3, color: "var(--color-text-main)" }}
        >
          Konfiguracja
        </Typography>

        {/* Przyciski i kontrolki */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            alignItems: "flex-start",
            flexWrap: "wrap",
            flexDirection: "column",
          }}
        >
          <TextField
            select
            SelectProps={{ native: true }}
            label="Źródło potraw"
            value={selectedListId}
            onChange={(e) => {
              setSelectedListId(e.target.value);
              setTempConfigs({}); // Reset temp configs when source changes
            }}
            size="small"
          >
            <option value="all">Wszystkie potrawy</option>
            {availableLists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.dishes.length})
              </option>
            ))}
          </TextField>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              flexDirection: "column",
            }}
          >
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
          </Box>
          {mergedDishesForList().length > 0 && (
            <Box
              sx={{
                width: "100%",
                mt: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{ mb: 2, color: "var(--color-text-main)" }}
              >
                Dodatkowa konfiguracja
              </Typography>
              <Box
                className="config-scroll-container"
                sx={{
                  width: "100%",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <ListDishesConfig
                  dishes={mergedDishesForList()}
                  onDishChange={handleDishConfigChange}
                />
              </Box>
            </Box>
          )}
        </Box>

        <Button
          variant="contained"
          className="primary"
          onClick={handleGenerateMenu}
        >
          Generuj jadłospis
        </Button>

        <Typography
          variant="h4"
          sx={{
            mb: 3,
            /*height: {
              xs: 60, // 0 - 600
              sm: 70, // 600 - 900
              md: 75, // 900 - 1200
            },*/
          }} // usunięto color: "var(--color-text-main)"
          className="section-title"
        >
          Jadłospis
        </Typography>
        {menu &&
          Array.isArray(menu) &&
          menu.length > 0 &&
          (Array.isArray(menu[0]) ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                marginTop: "100px",
              }}
            >
              {menu.map((week, wi) => (
                <Box
                  key={wi}
                  ref={(el) => (weekRefs.current[wi] = el)}
                  sx={{ scrollMargin: "20px" }}
                >
                  <Box className="table-week" sx={{ mb: 1 }}>
                    <Typography variant="h6">Tydzień {wi + 1}</Typography>
                  </Box>

                  {isNarrow ? (
                    <MobileJadlospis
                      week={week}
                      wi={wi}
                      dishesAll={dishesAll}
                      settings={settings}
                      ui={ui}
                      getVisualDay={getVisualDay}
                      startTouchDragCell={startTouchDragCell}
                    />
                  ) : (
                    <DesktopJadlospis
                      week={week}
                      wi={wi}
                      dishesAll={dishesAll}
                      settings={settings}
                      ui={ui}
                      isNarrow={isNarrow}
                      cellPadding={cellPadding}
                      getVisualDay={getVisualDay}
                      handleDragOver={handleDragOver}
                      handleDrop={handleDrop}
                      startTouchDragCell={startTouchDragCell}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                    />
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            // single-week -> render as a single week using same components
            <>
              {isNarrow ? (
                <MobileJadlospis
                  week={menu}
                  wi={0}
                  dishesAll={dishesAll}
                  settings={settings}
                  ui={ui}
                  getVisualDay={getVisualDay}
                  startTouchDragCell={startTouchDragCell}
                />
              ) : (
                <DesktopJadlospis
                  week={menu}
                  wi={0}
                  dishesAll={dishesAll}
                  settings={settings}
                  ui={ui}
                  isNarrow={isNarrow}
                  cellPadding={cellPadding}
                  getVisualDay={getVisualDay}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                  startTouchDragCell={startTouchDragCell}
                  handleDragStart={handleDragStart}
                  handleDragEnd={handleDragEnd}
                />
              )}
            </>
          ))}
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          {isGenerated && <Button
            variant="contained"
            className="primary"
            onClick={handleSaveCurrentMenu}
            sx={{
              marginTop: 2,
            }}
          >
            Zapisz jadłospdis
          </Button>}
        </Box>
      </Box>
    </Box>
  );
}
