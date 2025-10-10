import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
  Paper,
} from "@mui/material";
import { settings } from "../js/settings"; // Import settings z osobnego pliku

export default function Ustawienia() {
  const [excludedTags, setExcludedTags] = useState(settings.excludedTags);
  const [specialDishes, setSpecialDishes] = useState(settings.specialDishes);
  const firstLoadRef = useRef(true);
  const saveTimeoutRef = useRef(null);
  const dirtyRef = useRef(false);

  const initialUi = settings.ui ||
    JSON.parse(localStorage.getItem("uiSettings")) || {
      showFavoriteStar: true,
      compactTable: false,
      // highlightFavorites removed
      showRating: true,
      showTags: true,
    };
  const [uiSettings, setUiSettings] = useState(initialUi);

  // custom text shown when there's no dish (stored as plain string)
  const [noDishText, setNoDishText] = useState(
    settings.noDishText || localStorage.getItem("noDishText") || "Brak potraw"
  );
  const [editedTags, setEditedTags] = useState({});
  const [editedSpecialDishes, setEditedSpecialDishes] = useState({});

  // persist current settings (merge editedTags/editedSpecialDishes) to settings + localStorage
  const persistAll = (showToast = false) => {
    // merge editedTags into excludedTags
    const updatedTags = { ...excludedTags };
    Object.keys(editedTags).forEach((day) => {
      if (typeof updatedTags[day] !== "object") updatedTags[day] = {};
      Object.keys(editedTags[day] || {}).forEach((meal) => {
        const newTags = editedTags[day][meal]
          ? editedTags[day][meal].split(",").map((tag) => tag.trim())
          : [];
        updatedTags[day][meal] = newTags;
      });
    });
    setExcludedTags(updatedTags);
    settings.excludedTags = updatedTags;
    localStorage.setItem("excludedTags", JSON.stringify(updatedTags));

    // merge editedSpecialDishes into specialDishes
    const updatedSpecial = { ...specialDishes };
    Object.keys(editedSpecialDishes).forEach((day) => {
      if (typeof updatedSpecial[day] !== "object") updatedSpecial[day] = {};
      Object.keys(editedSpecialDishes[day] || {}).forEach((meal) => {
        updatedSpecial[day][meal] = editedSpecialDishes[day][meal] || "";
      });
    });
    setSpecialDishes(updatedSpecial);
    settings.specialDishes = updatedSpecial;
    localStorage.setItem("specialDishes", JSON.stringify(updatedSpecial));

    // UI settings + noDishText
    settings.ui = uiSettings;
    localStorage.setItem("uiSettings", JSON.stringify(uiSettings));
    settings.noDishText = noDishText;
    localStorage.setItem("noDishText", noDishText);

    // clear staged edits
    setEditedTags({});
    setEditedSpecialDishes({});
  };

  const handleEditTagChange = (day, meal, value) => {
    setEditedTags((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: value,
      },
    }));
  };

  const handleEditSpecialDishChange = (day, meal, value) => {
    setEditedSpecialDishes((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: value,
      },
    }));
  };

  const toggleUi = (key) => {
    setUiSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveAll = () => {
    persistAll(true);
  };

  // autosave: debounce changes to avoid spam; don't run on first load
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistAll(true);
      dirtyRef.current = false;
      saveTimeoutRef.current = null;
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    editedTags,
    editedSpecialDishes,
    uiSettings,
    noDishText,
    excludedTags,
    specialDishes,
  ]);

  // Sekcja ustawień wyglądu (uprzątnięta, pionowy układ)
  return (
    <Box
      id="container"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "flex-start",
        padding: 2,
        gap: 2,
      }}
    >
      <Typography variant="h4" sx={{ mb: 1 }}>
        Ustawienia
      </Typography>

      {/* Sekcja ustawień stylistycznych - otoczona Paper */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Ustawienia wyglądu
        </Typography>

        <Stack direction="column" spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={!!uiSettings.showFavoriteStar}
                onChange={() => toggleUi("showFavoriteStar")}
              />
            }
            label="Pokaż serce obok ulubionych"
          />

          <FormControlLabel
            control={
              <Switch
                checked={!!uiSettings.compactTable}
                onChange={() => toggleUi("compactTable")}
              />
            }
            label="Kompaktowy widok tabeli"
          />

          {/* usunięto: Podświetl ulubione w jadłospisie */}

          <FormControlLabel
            control={
              <Switch
                checked={!!uiSettings.showRating}
                onChange={() => toggleUi("showRating")}
              />
            }
            label="Pokaż ocenę w jadłospisie"
          />

          <FormControlLabel
            control={
              <Switch
                checked={!!uiSettings.showTags}
                onChange={() => toggleUi("showTags")}
              />
            }
            label="Pokaż tagi w jadłospisie"
          />
        </Stack>

        {/* custom no-dish text */}
        <Box sx={{ mt: 2, width: "100%", maxWidth: 520 }}>
          <TextField
            label="Tekst gdy brak potrawy"
            fullWidth
            size="small"
            value={noDishText}
            onChange={(e) => setNoDishText(e.target.value)}
            helperText='Wyświetlany tekst gdy w komórce jadłospisu nie ma potrawy (np. "Brak potraw").'
          />
        </Box>
      </Paper>

      <Divider />

      {/* Dodany nagłówek sekcji generowania */}
      <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>
        Ustawienia generowania jadłospisu
      </Typography>

      <Table size={uiSettings.compactTable ? "small" : "medium"}>
        <TableHead>
          <TableRow>
            <TableCell>
              <strong>Dzień tygodnia</strong>
            </TableCell>
            <TableCell>
              <strong>Śniadanie</strong>
            </TableCell>
            <TableCell>
              <strong>Obiad</strong>
            </TableCell>
            <TableCell>
              <strong>Kolacja</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(excludedTags).map((day) => (
            <TableRow key={day}>
              <TableCell>
                <strong>{day}</strong>
              </TableCell>
              {["śniadanie", "obiad", "kolacja"].map((meal) => (
                <TableCell
                  key={meal}
                  sx={{
                    ...(uiSettings.highlightFavorites
                      ? { backgroundColor: "transparent" }
                      : {}),
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Wykluczone tagi:
                  </Typography>
                  <TextField
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={3}
                    value={
                      editedTags[day]?.[meal] !== undefined
                        ? editedTags[day][meal]
                        : (excludedTags[day]?.[meal] || []).join(", ")
                    }
                    onChange={(e) =>
                      handleEditTagChange(day, meal, e.target.value)
                    }
                    placeholder="np. mięso, szybkie, gluten"
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Potrawa specjalna:
                  </Typography>
                  <TextField
                    variant="outlined"
                    fullWidth
                    value={
                      editedSpecialDishes[day]?.[meal] !== undefined
                        ? editedSpecialDishes[day][meal]
                        : specialDishes[day][meal]
                    }
                    onChange={(e) =>
                      handleEditSpecialDishChange(day, meal, e.target.value)
                    }
                    placeholder="np. gulasz"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button variant="contained" onClick={handleSaveAll}>
          Zapisz ustawienia
        </Button>
      </Box>
    </Box>
  );
}
