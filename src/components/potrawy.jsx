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
  Slider,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import defaultDishes from "../js/potrawy";
import Swal from "sweetalert2";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { Rating } from "@mui/material";
import PublishIcon from "@mui/icons-material/Publish";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

// ensure key exists (do not overwrite existing data)
ensureLocalDefault("dishes", defaultDishes || []);

export default function Potrawy() {
  // Przenieś useRef na początek komponentu
  const lastFavoriteUpdate = useRef({ index: null, ts: 0 });

  const [openIndex, setOpenIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [version, setVersion] = useState(0); // wymusza rerender po zmianach bez edycji
  const [filterRating, setFilterRating] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filterTagsInput, setFilterTagsInput] = useState(""); // nowe pole: tagi oddzielone przecinkami

  // bulk edit by tag
  const [tagToEdit, setTagToEdit] = useState("");
  const [bulkEdited, setBulkEdited] = useState({
    probability: null,
    maxRepeats: "",
    maxAcrossWeeks: "",
    allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
    color: "",
    favorite: null,
    rating: null,
  });

  // stan dla edytowanej potrawy (używany przez handleEdit / edycję)
  const [editedDish, setEditedDish] = useState({
    name: "",
    tags: "",
    params: "",
    ingredients: "",
    probability: 100,
    maxRepeats: 1,
    maxPerDay: "",
    allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
    rating: 0,
    favorite: false,
    color: "",
    maxAcrossWeeks: "",
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

  const handleEdit = (index) => {
    const dish = dishes[index] || {};
    setEditIndex(index);
    setEditedDish({
      name: dish.name || "",
      tags: Array.isArray(dish.tags) ? dish.tags.join(", ") : dish.tags || "",
      params: dish.params || "",
      ingredients: Array.isArray(dish.ingredients)
        ? dish.ingredients.join(", ")
        : dish.ingredients || "",
      probability: dish.probability || 100,
      maxRepeats: dish.maxRepeats || 1,
      maxPerDay: dish.maxPerDay ?? "",
      allowedMeals: {
        śniadanie: dish.allowedMeals?.includes("śniadanie") || false,
        obiad: dish.allowedMeals?.includes("obiad") || false,
        kolacja: dish.allowedMeals?.includes("kolacja") || false,
      },
      rating: dish.rating || 0,
      favorite: !!dish.favorite,
      color: dish.color || "",
      maxAcrossWeeks: dish.maxAcrossWeeks ?? "",
    });
  };

  const handleSave = (index) => {
    setDishes((prev) => {
      const copy = [...prev];
      const d = copy[index] || {};
      copy[index] = {
        ...d,
        name: editedDish.name,
        tags: editedDish.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        params: editedDish.params,
        ingredients: editedDish.ingredients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        probability: editedDish.probability,
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
        color: editedDish.color || d.color || "",
        maxAcrossWeeks:
          editedDish.maxAcrossWeeks === "" || editedDish.maxAcrossWeeks == null
            ? null
            : Number(editedDish.maxAcrossWeeks),
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
      probability: 100,
      maxRepeats: 1,
      maxPerDay: "",
      allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
      rating: 0,
      favorite: false,
      color: "",
      maxAcrossWeeks: "",
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
    console.log("toggled");
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

  // bulk edit logic (kept same, but using saveLocal when applying)
  const applyBulkForTag = () => {
    const tag = (tagToEdit || "").trim().toLowerCase();
    if (!tag) {
      Swal.fire({
        icon: "warning",
        title: "Podaj tag",
        confirmButtonText: "OK",
      });
      return;
    }
    setDishes((prev) => {
      let changed = 0;
      const copy = prev.map((dish) => {
        if (!Array.isArray(dish.tags)) return dish;
        if (!dish.tags.some((t) => ("" + t).toLowerCase() === tag)) return dish;
        const nd = { ...dish };
        if (bulkEdited.probability != null)
          nd.probability = Number(bulkEdited.probability);
        if (bulkEdited.maxRepeats !== "")
          nd.maxRepeats = Number(bulkEdited.maxRepeats);
        if (bulkEdited.maxAcrossWeeks !== "")
          nd.maxAcrossWeeks = Number(bulkEdited.maxAcrossWeeks);
        if (bulkEdited.color !== "") nd.color = bulkEdited.color;
        if (bulkEdited.favorite !== null) nd.favorite = !!bulkEdited.favorite;
        if (bulkEdited.rating != null) nd.rating = Number(bulkEdited.rating);
        nd.allowedMeals = Object.keys(bulkEdited.allowedMeals).filter(
          (m) => bulkEdited.allowedMeals[m]
        );
        changed++;
        return nd;
      });
      if (changed > 0) {
        saveLocal(copy);
        Swal.fire({
          icon: "success",
          title: "Zaktualizowano",
          text: `Zaktualizowano ${changed} potraw(y) z tagiem "${tagToEdit}"`,
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Brak rezultatów",
          text: "Nie znaleziono potraw z podanym tagiem.",
          confirmButtonText: "OK",
        });
      }
      return copy;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Lista Potraw
      </Typography>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontSize: "1.1rem" }}>
            Min. ocena:
          </Typography>

          <Rating
            name="filter-rating"
            size="small"
            value={filterRating}
            onChange={(_, val) => setFilterRating(val || 0)}
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />
          }
          label="Tylko ulubione"
        />
        <Button
          variant="contained" // zmiana z outlined na contained
          onClick={() => {
            setFilterRating(0);
            setOnlyFavorites(false);
            setFilterTagsInput("");
          }}
        >
          Wyczyść filtry
        </Button>
      </Box>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="tagi"
          size="small"
          value={filterTagsInput}
          onChange={(e) => setFilterTagsInput(e.target.value)}
          sx={{ minWidth: 220 }}
        />
      </Box>

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
                secondaryAction={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Rating
                      name={`rating-${index}`}
                      size="small"
                      value={dish.rating || 0}
                      onChange={(e, val) => setDishRating(index, val || 0)}
                    />
                    <IconButton
                      edge="end"
                      aria-label="favorite"
                      onClick={(e) => toggleFavorite(index, e)} // Dodaj event jako parametr
                      sx={{ zIndex: 2 }} // Dodaj zIndex aby upewnić się, że przycisk jest klikalny
                    >
                      {dish.favorite ? (
                        <FavoriteIcon color="error" />
                      ) : (
                        <FavoriteBorderIcon />
                      )}
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText
                  primary={dish.name}
                  secondary={
                    <span>
                      {Array.isArray(dish.tags)
                        ? dish.tags.join(", ")
                        : dish.tags}
                    </span>
                  }
                />
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
                            {ing}
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
                      Współczynnik występowania: {dish.probability ?? 100}%
                    </Typography>
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
                    >
                      <Typography variant="body2">Kolor tła:</Typography>
                      {dish.color ? (
                        <Box
                          sx={{
                            width: 24,
                            height: 16,
                            bgcolor: dish.color,
                            border: "1px solid rgba(0,0,0,0.12)",
                            borderRadius: 1,
                          }}
                        />
                      ) : (
                        <Typography variant="body2">Brak</Typography>
                      )}
                    </Box>
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
                      <TextField
                        label="Składniki: "
                        variant="outlined"
                        fullWidth
                        value={editedDish.ingredients}
                        onChange={(e) =>
                          setEditedDish({
                            ...editedDish,
                            ingredients: e.target.value,
                          })
                        }
                        sx={{ mb: 2 }}
                      />
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
                      <Typography gutterBottom>
                        Współczynnik występowania: {editedDish.probability}%
                      </Typography>
                      <Slider
                        value={editedDish.probability}
                        onChange={(e, newValue) =>
                          setEditedDish({
                            ...editedDish,
                            probability: newValue,
                          })
                        }
                        min={0}
                        max={100}
                        valueLabelDisplay="auto"
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
                              checked={editedDish.allowedMeals.śniadanie}
                              onChange={() => handleMealChange("śniadanie")}
                            />
                          }
                          label="Śniadanie"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editedDish.allowedMeals.obiad}
                              onChange={() => handleMealChange("obiad")}
                            />
                          }
                          label="Obiad"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editedDish.allowedMeals.kolacja}
                              onChange={() => handleMealChange("kolacja")}
                            />
                          }
                          label="Kolacja"
                        />
                      </FormGroup>
                      <Typography gutterBottom sx={{ mt: 2 }}>
                        Kolor tła w jadłospisie:
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mb: 2,
                          alignItems: "center",
                        }}
                      >
                        {[
                          { id: "", label: "Brak", color: "" },
                          {
                            id: "#ccffd0",
                            label: "Jasna zieleń",
                            color: "#ccffd0",
                          },
                          {
                            id: "#c0deff",
                            label: "Jasny niebieski",
                            color: "#c0deff",
                          },
                          {
                            id: "#ffc7c7",
                            label: "Jasny czerwony",
                            color: "#ffc7c7",
                          },
                          {
                            id: "#fff6bc",
                            label: "Jasny żółty",
                            color: "#fff6bc",
                          },
                          {
                            id: "#ddc0ff",
                            label: "Jasny fiolet",
                            color: "#ddc0ff",
                          },
                        ].map((opt) => (
                          <Button
                            key={opt.id || "none"}
                            variant={
                              editedDish.color === opt.id
                                ? "contained"
                                : "outlined"
                            }
                            onClick={() =>
                              setEditedDish((prev) => ({
                                ...prev,
                                color: opt.id,
                              }))
                            }
                            sx={{
                              minWidth: 36,
                              padding: 0.5,
                              bgcolor: opt.color || "transparent",
                              borderColor:
                                editedDish.color === opt.id
                                  ? "primary.main"
                                  : undefined,
                            }}
                            title={opt.label}
                          >
                            {opt.id === "" ? "Brak" : ""}
                          </Button>
                        ))}

                        {/* custom color picker */}
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "center",
                            ml: 1,
                          }}
                        >
                          <input
                            type="color"
                            value={editedDish.color || "#ffffff"}
                            onChange={(e) =>
                              setEditedDish((prev) => ({
                                ...prev,
                                color: e.target.value,
                              }))
                            }
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
                            value={editedDish.color}
                            onChange={(e) =>
                              setEditedDish((prev) => ({
                                ...prev,
                                color: e.target.value,
                              }))
                            }
                            placeholder="#rrggbb"
                            sx={{ width: 120 }}
                          />
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleSave(index)}
                        sx={{ mr: 2 }}
                      >
                        Zapisz
                      </Button>
                      <Button variant="outlined" onClick={handleCancel}>
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
                            const key = body._id || dish.name;
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
