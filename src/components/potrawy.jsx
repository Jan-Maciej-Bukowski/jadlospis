import React, { useState, useEffect, useRef } from "react";
import { ensureLocalDefault } from "../utils/storageHelpers";
import { safeParse } from "../utils/safeParse";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Typography,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import defaultDishes from "../js/potrawy";
import Swal from "sweetalert2";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { Rating } from "@mui/material";
import PublishIcon from "@mui/icons-material/Publish";
import { validateAmount } from "../utils/limits";
import DAYS from "../utils/days.js";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

// ensure key exists (do not overwrite existing data)
ensureLocalDefault("dishes", defaultDishes || []);

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

export default function Potrawy() {
  // Przenieś useRef na początek komponentu
  const lastFavoriteUpdate = useRef({ index: null, ts: 0 });

  const [openIndex, setOpenIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [filterRating, setFilterRating] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filterTagsInput, setFilterTagsInput] = useState("");
  const [version, setVersion] = useState(0); // do wymuszania rerendera po zapisie

  // stan dla edytowanej potrawy (używany przez handleEdit / edycję)
  const [editedDish, setEditedDish] = useState({
    name: "",
    tags: "",
    params: "",
    ingredients: "",
    maxRepeats: 1,
    maxPerDay: "",
    allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
    rating: 0,
    favorite: false,
    maxAcrossWeeks: "",
    allowedDays: DAYS,
    avatar: null, // ADDED: init avatar to null
  });

  // dishes state: load from localStorage or fallback to defaultDishes
  const [dishes, setDishes] = useState(() =>
    safeParse(localStorage.getItem("dishes"), defaultDishes || [])
  );

  useEffect(() => {
    // listen for external updates (other tabs / sync)
    const handler = (e) => {
      const ext = safeParse(localStorage.getItem("dishes"), null);
      if (ext) setDishes(ext);
    };
    window.addEventListener("dishesUpdated", handler);
    const storageHandler = (e) => {
      if (e.key === "dishes") {
        const val = safeParse(e.newValue, null);
        if (val) setDishes(val);
      }
    };
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener("dishesUpdated", handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  const saveLocal = (next) => {
    const toSave = next ?? dishes;
    try {
      localStorage.setItem("dishes", JSON.stringify(toSave));
    } catch {}
    setVersion((v) => v + 1);
    // notify sync module / other components
    try {
      window.dispatchEvent(
        new CustomEvent("dishesUpdated", { detail: toSave })
      );
    } catch {}
  };

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // helper to build image src
  const imgSrc = (dish) => {
    console.log(dish);
    if (!dish) return null;
    const a = dish.avatar || dish.image || "";
    if (!a) return null;
    if (a.startsWith("http")) return a;
    console.log(`obraz: ${API}${a}`);
    return `${API}${a}`;
  };

  // when entering edit mode, populate avatar if present
  const handleEdit = (index) => {
    const dish = dishes[index] || {};
    setEditIndex(index);
    const newSettings = {
      name: dish.name || "",
      tags: Array.isArray(dish.tags) ? dish.tags.join(", ") : dish.tags || "",
      params: dish.params || "",
      ingredients:
        Array.isArray(dish.ingredients) && dish.ingredients.length > 0
          ? dish.ingredients.map((ing) => {
              if (typeof ing === "string") {
                return { name: ing, amount: "", unit: "g" };
              }
              return ing;
            })
          : [{ name: "", amount: "", unit: "g" }],
      maxRepeats: dish.maxRepeats || 1,
      maxPerDay: dish.maxPerDay ?? "",
      allowedMeals: {
        śniadanie: dish.allowedMeals?.includes("śniadanie") || false,
        obiad: dish.allowedMeals?.includes("obiad") || false,
        kolacja: dish.allowedMeals?.includes("kolacja") || false,
      },
      rating: dish.rating || 0,
      favorite: !!dish.favorite,
      maxAcrossWeeks: dish.maxAcrossWeeks ?? "",
      allowedDays: dish.allowedDays || DAYS,
      avatar: dish.avatar || null, // ADDED: zawsze inicjalizuj avatar
    };
    setEditedDish(newSettings);
  };

  // allow upload directly in edit: upload and set editedDish.avatar
  const uploadEditImage = async (file) => {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/api/uploads/image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const body = await res.json();
      setEditedDish((prev) => ({ ...prev, avatar: body.path }));
      return body.path;
    } catch (e) {
      console.error("uploadEditImage:", e);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się przesłać obrazu.",
      });
      return null;
    }
  };

  const handleSave = (index) => {
    // Walidacja wszystkich składników
    const errors = editedDish.ingredients.flatMap((ing, i) => {
      const error = validateAmount(ing.amount, ing.unit);
      if (error) return [`Składnik ${i + 1}: ${error}`];
      if (!ing.name.trim()) return [`Składnik ${i + 1}: Nazwa jest wymagana`];
      return [];
    });

    if (errors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Błędne dane",
        html: errors.join("<br>"),
      });
      return;
    }

    setDishes((prev) => {
      const copy = [...prev];
      const d = copy[index] || {};
      copy[index] = {
        ...copy[index],
        name: editedDish.name,
        tags: editedDish.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        params: editedDish.params,
        ingredients: editedDish.ingredients.filter(
          (ing) => ing.name.trim() && ing.amount
        ),
        maxRepeats: editedDish.maxRepeats,
        maxPerDay:
          editedDish.maxPerDay === "" || editedDish.maxPerDay == null
            ? null
            : Number(editedDish.maxPerDay),
        allowedMeals: Object.keys(editedDish.allowedMeals).filter(
          (meal) => editedDish.allowedMeals[meal]
        ),
        rating: editedDish.rating != null ? editedDish.rating : d.rating,
        favorite:
          editedDish.favorite != null ? editedDish.favorite : !!d.favorite,
        maxAcrossWeeks:
          editedDish.maxAcrossWeeks === "" || editedDish.maxAcrossWeeks == null
            ? null
            : Number(editedDish.maxAcrossWeeks),
        allowedDays:
          editedDish.allowedDays.length > 0 ? editedDish.allowedDays : DAYS,
        avatar: editedDish.avatar || null, // ADDED: zapisz avatar (może być null)
      };
      saveLocal(copy);
      return copy;
    });
    setEditIndex(null);
  };

  const handleCancel = () => {
    setEditIndex(null);
    setEditedDish({
      name: "",
      tags: "",
      params: "",
      ingredients: "",
      maxRepeats: 1,
      maxPerDay: "",
      allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
      rating: 0,
      favorite: false,
      maxAcrossWeeks: "",
      allowedDays: DAYS,
      avatar: null, // ADDED: init avatar to null
    });
  };

  const handleMealChange = (meal) => {
    setEditedDish((prev) => ({
      ...prev,
      allowedMeals: {
        ...prev.allowedMeals,
        [meal]: !prev.allowedMeals[meal],
      },
    }));
  };

  const toggleFavorite = (index, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // guard przed szybkimi, podwójnymi kliknięciami
    const now = Date.now();
    if (!toggleFavorite.last) toggleFavorite.last = { index: null, ts: 0 };
    const last = toggleFavorite.last;
    if (last.index === index && now - last.ts < 400) return;
    toggleFavorite.last = { index, ts: now };

    setDishes((prev) => {
      const copy = [...prev];
      const newFavorite = !copy[index]?.favorite;

      // Sprawdź czy ta sama zmiana nie została właśnie wykonana
      if (
        lastFavoriteUpdate.current.index === index &&
        Date.now() - lastFavoriteUpdate.current.ts < 100
      ) {
        return prev; // zignoruj duplikat
      }

      // Zapisz informację o tej zmianie
      lastFavoriteUpdate.current = { index, ts: Date.now() };

      copy[index] = {
        ...(copy[index] || {}),
        favorite: newFavorite,
      };

      // Zapisz w localStorage
      try {
        localStorage.setItem("dishes", JSON.stringify(copy));
        window.dispatchEvent(
          new CustomEvent("dishesUpdated", { detail: copy })
        );
      } catch (e) {
        console.warn("Failed to save dishes:", e);
      }

      return copy;
    });
  };

  const setDishRating = (index, value) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[index] = { ...(copy[index] || {}), rating: value };
      saveLocal(copy);
      return copy;
    });
  };

  const handleDelete = (index) => {
    const name = dishes[index]?.name || "potrawa";
    Swal.fire({
      title: `Usuń "${name}"?`,
      text: "Operacji nie można cofnąć.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
      cancelButtonText: "Anuluj",
    }).then((result) => {
      if (result.isConfirmed) {
        setDishes((prev) => {
          const copy = [...prev];
          copy.splice(index, 1);
          saveLocal(copy);
          return copy;
        });
        setOpenIndex(null);
        if (editIndex === index) setEditIndex(null);
        Swal.fire({
          icon: "success",
          title: "Usunięto",
          text: `"${name}" został usunięty.`,
        });
      }
    });
  };

  const addIngredient = () => {
    setEditedDish((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: "", amount: "", unit: "g" }],
    }));
  };

  const removeIngredient = (index) => {
    setEditedDish((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const updateIngredient = (index, field, value) => {
    setEditedDish((prev) => {
      const newIngredients = [...prev.ingredients];
      newIngredients[index] = { ...newIngredients[index], [field]: value };
      return { ...prev, ingredients: newIngredients };
    });
  };

  const handleDayChange = (day) => {
    setEditedDish((prev) => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter((d) => d !== day)
        : [...prev.allowedDays, day],
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Lista Potraw
      </Typography>

      <List>
        {dishes
          .filter((dish) => {
            if ((dish.rating || 0) < filterRating) return false;
            if (onlyFavorites && dish.favorite !== true) return false;
            // remove previous requirement "must have tags" — show also potrawy bez tagów
            // filtrowanie po wpisanych tagach (AND, case-insensitive)
            const raw = (filterTagsInput || "").trim();
            if (raw !== "") {
              const wanted = raw
                .split(",")
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean);
              if (wanted.length > 0) {
                const dishTags = (
                  Array.isArray(dish.tags)
                    ? dish.tags
                    : dish.tags
                    ? [dish.tags]
                    : []
                ).map((t) => ("" + t).toLowerCase());
                // wymagaj, by potrawa miała wszystkie wpisane tagi
                if (!wanted.every((t) => dishTags.includes(t))) return false;
              }
            }
            return true;
          })
          .map((dish, index) => (
            <React.Fragment key={index}>
              <ListItem
                button
                onClick={() => handleToggle(index)}
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
                  paddingRight: { xs: 2, sm: 16 }, // mniejszy padding na małych ekranach
                }}
              >
                {/* small thumbnail */}
                {imgSrc(dish) ? (
                  <img
                    src={imgSrc(dish)}
                    alt={dish.name}
                    style={{
                      width: 40,
                      height: 40,
                      objectFit: "cover",
                      borderRadius: 6,
                      marginRight: 12,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: "transparent",
                      mr: 1,
                    }}
                  />
                )}

                <ListItemText
                  primary={dish.name}
                  secondary={
                    <span>
                      {Array.isArray(dish.tags)
                        ? dish.tags.join(", ")
                        : dish.tags}
                    </span>
                  }
                  sx={{ mb: { xs: 1, sm: 0 }, width: "100%" }}
                />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    width: { xs: "100%", sm: "auto" },
                    position: { xs: "relative", sm: "absolute" },
                    right: { sm: 8 },
                  }}
                >
                  <Rating
                    name={`rating-${index}`}
                    size="small"
                    value={dish.rating || 0}
                    onChange={(e, val) => setDishRating(index, val || 0)}
                  />
                  <IconButton
                    edge="end"
                    aria-label="favorite"
                    onClick={(e) => toggleFavorite(index, e)}
                  >
                    {dish.favorite ? (
                      <FavoriteIcon color="error" />
                    ) : (
                      <FavoriteBorderIcon />
                    )}
                  </IconButton>
                </Box>
              </ListItem>

              <Collapse in={openIndex === index} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4, pb: 2 }}>
                  <Typography variant="subtitle1">Tagi:</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {Array.isArray(dish.tags)
                      ? dish.tags.join(", ")
                      : dish.tags || "Brak tagów"}
                  </Typography>

                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    Składniki:
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                    {Array.isArray(dish.ingredients) &&
                    dish.ingredients.length > 0 ? (
                      <ul style={{ margin: "6px 0 0 20px", paddingLeft: 16 }}>
                        {dish.ingredients.map((ing, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {typeof ing === "string"
                              ? ing
                              : `${ing.name}: ${ing.amount} ${ing.unit}`}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Brak składników"
                    )}
                  </Typography>

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Przepis:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}
                  >
                    {dish.params || "Brak przepisu/opisu"}
                  </Typography>

                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Szczegóły potrawy:
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2">
                      Maks powtórzeń w tygodniu: {dish.maxRepeats ?? 1}
                    </Typography>
                    <Typography variant="body2">
                      Maks wystąpień w wygenerowanym przedziale:{" "}
                      {dish.maxAcrossWeeks ?? "brak limitu"}
                    </Typography>
                    <Typography variant="body2">
                      Dozwolone pory dnia:{" "}
                      {dish.allowedMeals?.join(", ") || "Wszystkie"}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        mt: 1,
                      }}
                    ></Box>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        mt: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2">Ocena:</Typography>
                        <Rating
                          name={`rating-display-${index}`}
                          size="small"
                          value={dish.rating || 0}
                          readOnly
                          precision={0.5}
                        />
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2">Ulubione:</Typography>
                        {dish.favorite ? (
                          <FavoriteIcon color="error" fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <br />
                  {editIndex === index ? (
                    <Box sx={{ mt: 2 }}>
                      {/* Image edit control */}
                      <Box sx={{ mb: 2 }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files && e.target.files[0];
                            if (!f) return;
                            await uploadEditImage(f);
                          }}
                          style={{ display: "block", marginBottom: 8 }}
                        />
                        {editedDish.avatar && (
                          <img
                            src={imgSrc({ avatar: editedDish.avatar })}
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
                        label="Nazwa potrawy"
                        variant="outlined"
                        fullWidth
                        value={editedDish.name}
                        onChange={(e) =>
                          setEditedDish({ ...editedDish, name: e.target.value })
                        }
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        label="Tagi (oddzielone przecinkami)"
                        variant="outlined"
                        fullWidth
                        value={editedDish.tags}
                        onChange={(e) =>
                          setEditedDish({ ...editedDish, tags: e.target.value })
                        }
                        sx={{ mb: 2 }}
                      />
                      <Box sx={{ width: "100%", mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Składniki:
                        </Typography>
                        {editedDish.ingredients.map((ing, index) => {
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
                                  updateIngredient(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                                sx={{ flexGrow: 1 }}
                              />
                              <TextField
                                label="Ilość"
                                size="small"
                                type="number"
                                value={ing.amount}
                                onChange={(e) =>
                                  updateIngredient(
                                    index,
                                    "amount",
                                    e.target.value
                                  )
                                }
                                sx={{ width: 100 }}
                                inputProps={{ min: 0, step: 0.1 }}
                                error={!!error}
                                helperText={error}
                              />
                              <TextField
                                select
                                label="Jednostka"
                                size="small"
                                value={ing.unit}
                                onChange={(e) =>
                                  updateIngredient(
                                    index,
                                    "unit",
                                    e.target.value
                                  )
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
                                disabled={editedDish.ingredients.length === 1}
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
                        label="Parametry / Przepis"
                        variant="outlined"
                        fullWidth
                        value={editedDish.params}
                        onChange={(e) =>
                          setEditedDish({
                            ...editedDish,
                            params: e.target.value,
                          })
                        }
                        sx={{ mb: 2 }}
                      />

                      <TextField
                        label="Maksymalna liczba powtórzeń"
                        variant="outlined"
                        type="number"
                        size="small"
                        value={editedDish.maxRepeats}
                        onChange={(e) =>
                          setEditedDish({
                            ...editedDish,
                            maxRepeats: Number(e.target.value),
                          })
                        }
                        slotProps={{
                          htmlInput: {
                            min: 0,
                          },
                        }}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        label="Maks na dzień"
                        variant="outlined"
                        type="number"
                        size="small"
                        value={editedDish.maxPerDay}
                        onChange={(e) =>
                          setEditedDish({
                            ...editedDish,
                            maxPerDay: e.target.value,
                          })
                        }
                        slotProps={{
                          htmlInput: {
                            min: 0,
                          },
                        }}
                        sx={{ mb: 2, ml: 0 }}
                      />
                      <br />
                      <TextField
                        label="Maks wystąpień w jadłospisie"
                        variant="outlined"
                        type="number"
                        size="small"
                        value={editedDish.maxAcrossWeeks}
                        onChange={(e) =>
                          setEditedDish((prev) => ({
                            ...prev,
                            maxAcrossWeeks: e.target.value,
                          }))
                        }
                        placeholder="np. 3"
                        sx={{ width: 260, mb: 2 }}
                      />
                      <Typography gutterBottom>Dozwolone pory dnia:</Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              className="checkbox"
                              checked={editedDish.allowedMeals.śniadanie}
                              onChange={() => handleMealChange("śniadanie")}
                            />
                          }
                          label="Śniadanie"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              className="checkbox"
                              checked={editedDish.allowedMeals.obiad}
                              onChange={() => handleMealChange("obiad")}
                            />
                          }
                          label="Obiad"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              className="checkbox"
                              checked={editedDish.allowedMeals.kolacja}
                              onChange={() => handleMealChange("kolacja")}
                            />
                          }
                          label="Kolacja"
                        />
                      </FormGroup>

                      {/* NOWA SEKCJA: Dozwolone dni tygodnia */}
                      <Typography gutterBottom sx={{ mt: 2 }}>
                        Dozwolone dni tygodnia:
                      </Typography>
                      <FormGroup row>
                        {DAYS.map((day) => (
                          <FormControlLabel
                            key={day}
                            control={
                              <Checkbox
                                className="checkbox"
                                checked={(
                                  editedDish.allowedDays || []
                                ).includes(day)}
                                onChange={() => handleDayChange(day)}
                                size="small"
                              />
                            }
                            label={day}
                          />
                        ))}
                      </FormGroup>

                      <Button
                        variant="contained"
                        className="primary"
                        onClick={() => handleSave(index)}
                        sx={{ mr: 2 }}
                      >
                        Zapisz
                      </Button>
                      <Button
                        variant="outlined"
                        sx={{
                          borderColor: "var(--color-primary)",
                          color: "var(--color-primary)",
                        }}
                        onClick={handleCancel}
                      >
                        Anuluj
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(index);
                        }}
                      >
                        Edytuj
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(index);
                        }}
                      >
                        Usuń
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PublishIcon />}
                        onClick={async (e) => {
                          e.stopPropagation();
                          // publish dish - guard duplicates (frontend)
                          const token = localStorage.getItem("token");
                          if (!token) {
                            Swal.fire({
                              icon: "warning",
                              title: "Zaloguj się",
                              text: "Musisz być zalogowany, żeby opublikować potrawę.",
                            });
                            return;
                          }
                          try {
                            const publishedRaw =
                              localStorage.getItem("publishedDishes") || "[]";
                            const published = JSON.parse(publishedRaw || "[]");
                            // check by name first
                            if (published.includes(dish.name)) {
                              Swal.fire({
                                icon: "info",
                                title: "Już opublikowano",
                                text: "Wygląda na to, że tę potrawę już opublikowałeś.",
                              });
                              return;
                            }

                            const payload = { ...dish };
                            const res = await fetch(
                              `${API}/api/public/dishes`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify(payload),
                              }
                            );
                            if (!res.ok) {
                              const body = await res.json().catch(() => ({}));
                              throw new Error(
                                body.error || res.statusText || "Publish failed"
                              );
                            }
                            const body = await res.json().catch(() => ({}));
                            // remember published by name (and id if returned)
                            //const key = body._id || dish.name;
                            published.push(dish.name);
                            localStorage.setItem(
                              "publishedDishes",
                              JSON.stringify(published)
                            );
                            Swal.fire({
                              icon: "success",
                              title: "Opublikowano",
                              text: "Potrawa została opublikowana.",
                            });
                          } catch (err) {
                            console.error("publish dish:", err);
                            Swal.fire({
                              icon: "error",
                              title: "Błąd",
                              text:
                                err.message ||
                                "Nie udało się opublikować potrawy.",
                            });
                          }
                        }}
                      >
                        Publikuj
                      </Button>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </React.Fragment>
          ))}
      </List>
    </Box>
  );
}
