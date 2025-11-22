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
import { validateAmount } from "../utils/limits";
import DAYS from "../utils/days.js";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

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
  const [maxRepeats, setMaxRepeats] = useState(21);
  const [allowedMeals, setAllowedMeals] = useState({
    śniadanie: true,
    obiad: true,
    kolacja: true,
  });
  const [allowedDays, setAllowedDays] = useState([...DAYS]);
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
  const [maxAcrossWeeks, setMaxAcrossWeeks] = useState(""); // liczba (opcjonalnie)
  const [maxPerDay, setMaxPerDay] = useState(3); // maks na dzień (opcjonalnie)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

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
      if (!ing.name.trim())
        return [`${ing.name ?? "Składnik " + i + 1}: Nazwa jest wymagana`];
      if (!ing.amount)
        return [`${ing.name ?? "Składnik " + i + 1}: Ilość jest wymagana`];

      const error = validateAmount(ing.amount, ing.unit);
      if (error) return [`${ing.name ?? "Składnik " + i + 1}: ${error}`];

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
      maxRepeats: maxRepeats,
      maxPerDay: maxPerDay === "" ? null : Number(maxPerDay),
      allowedMeals: Object.keys(allowedMeals).filter(
        (meal) => allowedMeals[meal]
      ),
      rating: rating,
      favorite: favorite,
      maxAcrossWeeks: maxAcrossWeeks ? Number(maxAcrossWeeks) : null,
      allowedDays: allowedDays.length ? allowedDays : DAYS,
      avatar: imageFile?.uploadedPath || null, // ADDED: dodaj avatar z uploadowanego pliku
    };

    console.log("new dish: ", data);
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
    setMaxRepeats(21);
    setAllowedMeals({ śniadanie: true, obiad: true, kolacja: true });
    setRating(0);
    setFavorite(false);
    setMaxAcrossWeeks("");
    setMaxPerDay(3);
    setSelectedLists([]);
    setAllowedDays([...DAYS]);
    setImageFile(null);
    setImagePreview(null);
  }

  // helper: upload image immediately and store returned path
  const uploadImage = async (file) => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(
        `${API_BASE.replace(/\/+$/, "")}/api/uploads/image`,
        {
          method: "POST",
          body: fd,
        }
      );
      if (!res.ok) throw new Error("Upload failed");
      const body = await res.json();
      return body.path; // e.g. /uploads/xxxx.jpg
    } catch (e) {
      console.error("uploadImage:", e);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się przesłać obrazu.",
      });
      return null;
    }
  };

  // file input change
  const onFileChange = async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    // show local preview
    const url = URL.createObjectURL(f);
    setImagePreview(url);
    setImageFile(f);

    // upload immediately (so we have path to save with dish)
    const path = await uploadImage(f);
    if (path) {
      // store uploaded path in a temporary state variable (we'll include it in newDish)
      setImageFile({ uploadedPath: path, originalFileName: f.name });
    } else {
      // reset on error
      setImageFile(null);
      setImagePreview(null);
    }
  };

  // generate image via server -> AI -> saved to /uploads
  const generateAiImage = async () => {
    const { value: prompt } = await Swal.fire({
      title: "Generuj obraz AI",
      input: "text",
      inputPlaceholder: "Krótki opis obrazu (np. 'zupa pomidorowa na talerzu')",
      showCancelButton: true,
      inputValidator: (v) => (!v || !v.trim() ? "Wpisz prompt" : null),
    });
    if (!prompt) return;

    Swal.fire({
      title: "Generowanie obrazu...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/api/ai/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          n: 1,
          model: "img3",
          size: "1024x1024",
        }),
      });
      if (!res.ok) throw new Error("AI generation failed");
      const body = await res.json();
      console.log("AI response:", body); // debug

      // FIXED: images zawiera obiekty { path, url }, nie stringi
      const images = Array.isArray(body.images) ? body.images : [];
      if (images.length === 0) throw new Error("No image returned");

      const img = images[0];
      // img powinno być { path: "/uploads/...", url: "http://..." }
      if (!img || !img.path) throw new Error("Invalid image object");

      setImageFile({
        uploadedPath: img.path,
        originalFileName: "ai-generated.jpg",
      });
      setImagePreview(img.url || img.path); // użyj full URL do podglądu
      Swal.close();
      Swal.fire({ icon: "success", title: "Wygenerowano obraz" });
    } catch (e) {
      console.error("AI generate error:", e);
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się wygenerować obrazu: " + e.message,
      });
    }
  };

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
        {/* image uploader */}
        <Box>
          <input
            id="dish-image"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            style={{ display: "block", marginBottom: 8 }}
          />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Button variant="outlined" size="small" onClick={generateAiImage}>
              Generuj AI
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
            >
              Usuń obraz
            </Button>
          </Box>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              style={{
                width: 80,
                height: 80,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
          )}
        </Box>

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
                  //helperText={error}
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
            sx={{ mt: 1, color: "var(--color-primary)" }}
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
                    className="checkbox"
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
              <Button
                variant="contained"
                onClick={createAndSelectList}
                className="primary"
              >
                Dodaj
              </Button>
            </Box>
          </Box>
        </Paper>
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
                className="checkbox"
                checked={allowedMeals.śniadanie}
                onChange={() => handleMealChange("śniadanie")}
              />
            }
            label="Śniadanie"
          />
          <FormControlLabel
            control={
              <Checkbox
                className="checkbox"
                checked={allowedMeals.obiad}
                onChange={() => handleMealChange("obiad")}
              />
            }
            label="Obiad"
          />
          <FormControlLabel
            control={
              <Checkbox
                className="checkbox"
                checked={allowedMeals.kolacja}
                onChange={() => handleMealChange("kolacja")}
              />
            }
            label="Kolacja"
          />
        </FormGroup>
        <Typography gutterBottom>Dozwolone dni:</Typography>
        <FormGroup row>
          {DAYS.map((day) => (
            <FormControlLabel
              key={day}
              control={
                <Checkbox
                  className="checkbox"
                  checked={allowedDays.includes(day)}
                  onChange={() => {
                    setAllowedDays((prev) =>
                      prev.includes(day)
                        ? prev.filter((d) => d !== day)
                        : [...prev, day]
                    );
                  }}
                  size="small"
                />
              }
              label={day}
            />
          ))}
        </FormGroup>
        <Typography gutterBottom>Ocena początkowa:</Typography>
        <Rating value={rating} onChange={(e, val) => setRating(val || 0)} />

        <FormControlLabel
          control={
            <Checkbox
              className="checkbox"
              checked={favorite}
              onChange={() => setFavorite((s) => !s)}
            />
          }
          label="Ulubione"
        />

        <Button
          onClick={newDish}
          variant="contained"
          className="primary"
          fullWidth
        >
          Dodaj
        </Button>
      </Box>
    </Box>
  );
}

// W komponencie Jadlospis, zmień funkcję startTouchDragCell:

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

  // ...rest of the function...

  const cleanup = () => {
    try {
      if (window.__touchDrag?.ghost) window.__touchDrag.ghost.remove();
    } catch (err) {}
    window.__touchDrag = null;
    // Przywróć poprzedni stan touchAction
    document.body.style.touchAction = window.__touchDrag?.prevTouchAction || "";
    window.removeEventListener("touchmove", onMove, { passive: false });
    window.removeEventListener("touchend", onEnd);
    window.removeEventListener("touchcancel", onEnd);
    document.removeEventListener("visibilitychange", onVisibility);
  };

  // ...rest of the function...
};
