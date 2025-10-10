import React, { useState } from "react";
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
} from "@mui/material";
import { addDish } from "../js/potrawy";
import Swal from "sweetalert2";

export default function DodajPotrawe() {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [params, setOtherParams] = useState(""); // przepis / opis
  const [ingredients, setIngredients] = useState(""); // składniki: jedna linia = jeden składnik
  const [probability, setProbability] = useState(100);
  const [maxRepeats, setMaxRepeats] = useState(21);
  const [allowedMeals, setAllowedMeals] = useState({
    śniadanie: true,
    obiad: true,
    kolacja: true,
  });
  const [rating, setRating] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [color, setColor] = useState(""); // kolor tła w jadlospisie
  const [maxAcrossWeeks, setMaxAcrossWeeks] = useState(""); // liczba (opcjonalnie)
  const [maxPerDay, setMaxPerDay] = useState(""); // maks na dzień (opcjonalnie)

  const handleMealChange = (meal) => {
    setAllowedMeals((prev) => ({ ...prev, [meal]: !prev[meal] }));
  };

  function newDish() {
    // walidacja: nazwa potrawy jest wymagana
    if (!name || !name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Brak nazwy potrawy",
        text: "Musisz podać nazwę potrawy, aby dodać ją do listy.",
        confirmButtonText: "OK",
      });
      return;
    }
    const data = {
      name: name,
      tags: tags,
      params: params,
      ingredients: ingredients,
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

    Swal.fire({
      title: "Dodano!",
      text: `Potrawa "${name}" została dodana.`,
      icon: "success",
      confirmButtonText: "OK",
    });

    setName("");
    setTags("");
    setOtherParams("");
    setIngredients("");
    setProbability(100);
    setMaxRepeats(21);
    setAllowedMeals({ śniadanie: true, obiad: true, kolacja: true });
    setRating(0);
    setFavorite(false);
    setColor("");
    setMaxAcrossWeeks("");
    setMaxPerDay("");
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
        <TextField
          label="Składniki (jedna linia = jeden składnik)"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          //helperText="Wpisz każdy składnik w nowej linii"
        />

        <TextField
          label="Przepis"
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={params}
          onChange={(e) => setOtherParams(e.target.value)}
        />
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
              max: 3
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
          onChange={(e) => setMaxRepeats(Number(e.target.value))}
          slotProps={{
            htmlInput: {
              min: 0,
              max: 7
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
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
          {[
            { id: "", label: "Brak", color: "" },
            { id: "#ccffd0", label: "Jasna zieleń", color: "#ccffd0" },
            { id: "#c0deff", label: "Jasny niebieski", color: "#c0deff" },
            { id: "#ffc7c7", label: "Jasny czerwony", color: "#ffc7c7" },
            { id: "#fff6bc", label: "Jasny żółty", color: "#fff6bc" },
            { id: "#ddc0ff", label: "Jasny fiolet", color: "#ddc0ff" },
          ].map((opt) => (
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
