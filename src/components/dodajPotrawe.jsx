import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Rating,
  Paper,
  MenuItem,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { addDish } from "../js/potrawy";
import Swal from "sweetalert2";
import { DISH_COLORS } from "../utils/colors";
import { validateAmount } from "../utils/limits";

// Stałe jednostki miary
const UNITS = [
  { value: "g", label: "gram (g)" },
  { value: "kg", label: "kilogram (kg)" },
  { value: "ml", label: "mililitr (ml)" },
  { value: "l", label: "litr (l)" },
  { value: "szt", label: "sztuka" },
  { value: "łyżka", label: "łyżka (15ml)" },
  { value: "łyżeczka", label: "łyżeczka (5ml)" },
  { value: "szklanka", label: "szklanka (250ml)" },
];

export default function DodajPotrawe() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [params, setOtherParams] = useState(""); // przepis / opis
  const [ingredients, setIngredients] = useState([
    { name: "", amount: "", unit: "g" },
  ]); // składniki: jedna linia = jeden składnik
  const [probability, setProbability] = useState(100);
  const [maxRepeats, setMaxRepeats] = useState(21);
  const [allowedMeals, setAllowedMeals] = useState({
    śniadanie: true,
    obiad: true,
    kolacja: true,
  });
  // lists management
  const [availableLists, setAvailableLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dishLists") || "[]");
    } catch {
      return [];
    }
  });
  const [selectedLists, setSelectedLists] = useState([]); // array of list ids
  const [newListName, setNewListName] = useState("");
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [color, setColor] = useState(""); // kolor tła w jadlospisie
  const [maxAcrossWeeks, setMaxAcrossWeeks] = useState(""); // liczba (opcjonalnie)
  const [maxPerDay, setMaxPerDay] = useState(""); // maks na dzień (opcjonalnie)

  useEffect(() => {
    const handler = () => {
      try {
        setAvailableLists(
          JSON.parse(localStorage.getItem("dishLists") || "[]")
        );
      } catch {
        setAvailableLists([]);
      }
    };
    window.addEventListener("dishListsUpdated", handler);
    window.addEventListener("storage", (e) => {
      if (e.key === "dishLists") handler();
    });
    return () => {
      window.removeEventListener("dishListsUpdated", handler);
    };
  }, []);

  const handleMealChange = (meal) => {
    setAllowedMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
  };

  const toggleListSelection = (id) => {
    setSelectedLists((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const createAndSelectList = () => {
    const name = (newListName || "").trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Podaj nazwę listy" });
      return;
    }
    const id = Date.now().toString();
    const next = [...availableLists, { id, name, dishes: [] }];
    localStorage.setItem("dishLists", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dishListsUpdated", { detail: next }));
    setAvailableLists(next);
    setSelectedLists((s) => [...s, id]);
    setNewListName("");
    Swal.fire({ icon: "success", title: "Utworzono listę", text: name });
  };

  const assignDishToLists = (dishName, listIds = []) => {
    try {
      const raw = localStorage.getItem("dishLists") || "[]";
      const lists = JSON.parse(raw || "[]");
      const next = lists.map((l) => {
        if (!listIds.includes(l.id)) return l;
        if (!Array.isArray(l.dishes)) l.dishes = [];
        if (!l.dishes.includes(dishName)) l.dishes.push(dishName);
        return l;
      });
      localStorage.setItem("dishLists", JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent("dishListsUpdated", { detail: next })
      );
    } catch (e) {
      console.warn("assignDishToLists:", e);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "g" }]);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index, field, value) => {
    const updated = ingredients.map((ing, i) => {
      if (i !== index) return ing;
      return { ...ing, [field]: value };
    });
    setIngredients(updated);
  };

  // walidacja: nazwa potrawy jest wymagana
  const validateName = () => {
    if (!name || !name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Brak nazwy potrawy",
        text: "Musisz podać nazwę potrawy, aby dodać ją do listy.",
        confirmButtonText: "OK",
      });
      return false;
    }
    return true;
  };

  // walidacja: przynajmniej jedna dozwolona pora dnia
  const validateAllowedMeals = () => {
    if (!Object.values(allowedMeals).some(Boolean)) {
      Swal.fire({
        icon: "warning",
        title: "Wybierz porę dnia",
        text: "Musisz zaznaczyć przynajmniej jedną dozwoloną porę dnia.",
      });
      return false;
    }
    return true;
  };

  // walidacja: składniki
  const validateIngredients = () => {
    const errors = ingredients.flatMap((ing, i) => {
      if (!ing.name.trim()) return [`Składnik ${i + 1}: Nazwa jest wymagana`];
      if (!ing.amount) return [`Składnik ${i + 1}: Ilość jest wymagana`];

      const error = validateAmount(ing.amount, ing.unit);
      if (error) return [`Składnik ${i + 1}: ${error}`];

      return [];
    });

    if (errors.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Błędne dane składników",
        html: errors.join("<br>"),
      });
      return false;
    }

    return true;
  };

  // walidacja: maksymalna liczba powtórzeń w tygodniu
  const validateMaxRepeats = () => {
    if (maxRepeats < 0 || maxRepeats > 21) {
      Swal.fire({
        icon: "warning",
        title: "Nieprawidłowa liczba powtórzeń",
        text: "Maksymalna liczba powtórzeń w tygodniu musi być między 0 a 21.",
      });
      return false;
    }
    return true;
  };

  // walidacja: maksymalna liczba wystąpień w dniu
  const validateMaxPerDay = () => {
    if (maxPerDay < 0 || maxPerDay > 3) {
      Swal.fire({
        icon: "warning",
        title: "Nieprawidłowa liczba wystąpień",
        text: "Maksymalna liczba wystąpień w dniu musi być między 0 a 3.",
      });
      return false;
    }
    return true;
  };

  // walidacja: maksymalna liczba wystąpień w jadłospisie
  const validateMaxAcrossWeeks = () => {
    if (maxAcrossWeeks < 0) {
      Swal.fire({
        icon: "warning",
        title: "Nieprawidłowa liczba wystąpień",
        text: "Maksymalna liczba wystąpień w jadłospisie nie może być ujemna.",
      });
      return false;
    }
    return true;
  };

  // główna funkcja dodająca potrawę
  function newDish() {
    if (
      !validateName() ||
      !validateAllowedMeals() ||
      !validateIngredients() ||
      !validateMaxRepeats() ||
      !validateMaxPerDay() ||
      !validateMaxAcrossWeeks()
    ) {
      return;
    }

    const data = {
      name: name,
      tags: tags,
      params: params,
      ingredients: ingredients.filter((ing) => ing.name && ing.amount), // tylko wypełnione
      probability: probability,
      maxRepeats: maxRepeats,
      maxPerDay: maxPerDay === "" ? null : Number(maxPerDay),
      allowedMeals: Object.keys(allowedMeals).filter(
        (meal) => allowedMeals[meal]
      ),
      rating: rating,
      favorite: favorite,
      color: color,
      maxAcrossWeeks: maxAcrossWeeks ? Number(maxAcrossWeeks) : null,
    };
    console.log("dodano potrawę: ", data);
    addDish(data);

    // przypisz potrawę do wybranych list (jeśli wybrano)
    if (data.name) assignDishToLists(data.name, selectedLists);

    Swal.fire({
      title: "Dodano!",
      text: `Potrawa "${name}" została dodana.`,
      icon: "success",
      confirmButtonText: "OK",
    });

    setName("");
    setTags("");
    setOtherParams("");
    setIngredients([{ name: "", amount: "", unit: "g" }]);
    setProbability(100);
    setMaxRepeats(21);
    setAllowedMeals({ śniadanie: true, obiad: true, kolacja: true });
    setRating(0);
    setFavorite(false);
    setColor("");
    setMaxAcrossWeeks("");
    setMaxPerDay("");
    setSelectedLists([]);
  }

  return (
    <Box
      id="container"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // renderuj pod navbarem (użyj CSS variable --navbar-height jeśli ustawiona, fallback 64px)
        marginTop: "var(--navbar-height, 0px)",
        // ogranicz wysokość względem widocznej przestrzeni pod navbarem i pozwól przewijać zawartość
        // maxHeight: "calc(100vh - var(--navbar-height, 64px) - 16px)", // to nie działa
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 2,
      }}
    >
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dodaj Nową Potrawę
      </Typography>

      <Box
        component="form"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <TextField
          label="Nazwa Potrawy"
          variant="outlined"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Tagi (np. wegańskie, szybkie)"
          variant="outlined"
          fullWidth
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        {/* Sekcja składników */}
        <Box sx={{ width: "100%", mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Składniki:
          </Typography>
          {ingredients.map((ing, index) => {
            const error = validateAmount(ing.amount, ing.unit);
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 1,
                  alignItems: "center",
                }}
              >
                <TextField
                  label="Nazwa"
                  size="small"
                  value={ing.name}
                  onChange={(e) =>
                    updateIngredient(index, "name", e.target.value)
                  }
                  sx={{ flexGrow: 1 }}
                />
                <TextField
                  label="Ilość"
                  size="small"
                  type="number"
                  value={ing.amount}
                  onChange={(e) =>
                    updateIngredient(index, "amount", e.target.value)
                  }
                  sx={{ width: 100 }}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={!!error}
                  helperText={error}
                  placeholder={!!error}
                />
                <TextField
                  select
                  label="Jednostka"
                  size="small"
                  value={ing.unit}
                  onChange={(e) =>
                    updateIngredient(index, "unit", e.target.value)
                  }
                  sx={{ width: 120 }}
                >
                  {UNITS.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </TextField>
                <IconButton
                  color="error"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          })}
          <Button
            startIcon={<AddIcon />}
            onClick={addIngredient}
            sx={{ mt: 1 }}
          >
            Dodaj składnik
          </Button>
        </Box>

        <TextField
          label="Przepis"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={params}
          onChange={(e) => setOtherParams(e.target.value)}
        />

        {/* Sekcja list */}
        <Paper sx={{ p: 2, mb: 2, width: "100%" }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Przypisz do list
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {availableLists.length === 0 && (
              <Typography variant="body2">
                Brak list. Możesz utworzyć nową.
              </Typography>
            )}
            {availableLists.map((l) => (
              <FormControlLabel
                key={l.id}
                control={
                  <Checkbox
                    checked={selectedLists.includes(l.id)}
                    onChange={() => toggleListSelection(l.id)}
                  />
                }
                label={l.name}
              />
            ))}
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <TextField
                size="small"
                placeholder="Utwórz nową listę..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                fullWidth
              />
              <Button variant="contained" onClick={createAndSelectList}>
                Dodaj
              </Button>
            </Box>
          </Box>
        </Paper>

        <Typography gutterBottom>
          Współczynnik występowania: {probability}%
        </Typography>
        <Slider
          value={probability}
          onChange={(e, newValue) => setProbability(newValue)}
          min={0}
          max={100}
          valueLabelDisplay="auto"
        />
        <TextField
          label="Maks wystąpień w dniu"
          variant="outlined"
          type="number"
          size="medium"
          value={maxPerDay}
          onChange={(e) => setMaxPerDay(e.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
              max: 3,
            },
          }}
          placeholder="np. 1"
          //sx={{ width: 260, mb: 1 }}
        />
        <TextField
          label="Maks wystąpień w tygodniu"
          variant="outlined"
          type="number"
          size="medium"
          value={maxRepeats}
          onChange={(e) => setMaxRepeats(e.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
              max: 21,
            },
          }}
        />
        <TextField
          label="Maks wystąpień w jadłospisie"
          variant="outlined"
          type="number"
          size="medium"
          value={maxAcrossWeeks}
          onChange={(e) => setMaxAcrossWeeks(e.target.value)}
          slotProps={{
            htmlInput: {
              min: 0,
            },
          }}
          placeholder="np. 3"
          //sx={{ width: 260, mb: 1 }}
        />
        <Typography gutterBottom>Dozwolone pory dnia:</Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={allowedMeals.śniadanie}
                onChange={() => handleMealChange("śniadanie")}
              />
            }
            label="Śniadanie"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={allowedMeals.obiad}
                onChange={() => handleMealChange("obiad")}
              />
            }
            label="Obiad"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={allowedMeals.kolacja}
                onChange={() => handleMealChange("kolacja")}
              />
            }
            label="Kolacja"
          />
        </FormGroup>
        <Typography gutterBottom>Ocena początkowa:</Typography>
        <Rating value={rating} onChange={(e, val) => setRating(val || 0)} />

        <FormControlLabel
          control={
            <Checkbox
              checked={favorite}
              onChange={() => setFavorite((s) => !s)}
            />
          }
          label="Ulubione"
        />

        <Typography gutterBottom sx={{ mt: 1 }}>
          Kolor tła w jadłospisie:
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {DISH_COLORS.map((opt) => (
            <Button
              key={opt.id || "none"}
              variant={color === opt.id ? "contained" : "outlined"}
              onClick={() => setColor(opt.id)}
              sx={{
                minWidth: 36,
                padding: 0.5,
                bgcolor: opt.color || "transparent",
                borderColor: color === opt.id ? "primary.main" : undefined,
              }}
              title={opt.label}
            >
              {opt.id === "" ? "Brak" : ""}
            </Button>
          ))}

          {/* custom color picker */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", ml: 1 }}>
            <input
              type="color"
              value={color || "#ffffff"}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
              title="Wybierz własny kolor"
            />
            <TextField
              size="small"
              label="HEX"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#rrggbb"
              sx={{ width: 120 }}
            />
          </Box>
        </Box>

        <Button onClick={newDish} variant="contained" color="primary" fullWidth>
          Dodaj
        </Button>
      </Box>
    </Box>
  );
}
