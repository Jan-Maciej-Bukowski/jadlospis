import React, { useState } from "react";
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
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import dishes from "../js/potrawy";
import Swal from "sweetalert2";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { Rating } from "@mui/material";

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export default function Potrawy() {
  const [openIndex, setOpenIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [version, setVersion] = useState(0); // wymusza rerender po zmianach bez edycji
  const [filterRating, setFilterRating] = useState(0);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
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

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleEdit = (index) => {
    const dish = dishes[index];
    setEditIndex(index);
    setEditedDish({
      name: dish.name,
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
    dishes[index].name = editedDish.name;
    dishes[index].tags = editedDish.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    dishes[index].params = editedDish.params;
    dishes[index].ingredients = editedDish.ingredients
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    dishes[index].probability = editedDish.probability;
    dishes[index].maxRepeats = editedDish.maxRepeats;
    dishes[index].maxPerDay =
      editedDish.maxPerDay === "" || editedDish.maxPerDay == null
        ? null
        : Number(editedDish.maxPerDay);
    dishes[index].allowedMeals = Object.keys(editedDish.allowedMeals).filter(
      (meal) => editedDish.allowedMeals[meal]
    );
    if (editedDish.rating != null) dishes[index].rating = editedDish.rating;
    if (editedDish.favorite != null)
      dishes[index].favorite = editedDish.favorite;
    // save color
    dishes[index].color = editedDish.color || "";
    dishes[index].maxAcrossWeeks =
      editedDish.maxAcrossWeeks === "" || editedDish.maxAcrossWeeks == null
        ? null
        : Number(editedDish.maxAcrossWeeks);

    // Zapisz i wymuś rerender
    localStorage.setItem("dishes", JSON.stringify(dishes));
    setVersion((v) => v + 1);
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

  const toggleFavorite = (index) => {
    dishes[index].favorite = !dishes[index].favorite;
    saveLocal();
  };

  const setDishRating = (index, value) => {
    dishes[index].rating = value;
    saveLocal();
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
        dishes.splice(index, 1);
        saveLocal();
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

  const saveLocal = () => {
    localStorage.setItem("dishes", JSON.stringify(dishes));
    setVersion((v) => v + 1);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Lista Potraw
      </Typography>

      {/* Filtry */}
      {/* Masowa edycja po tagu */}
      <Box
        sx={{
          mb: 2,
          p: 2,
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Masowa edycja potraw po tagu
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            mb: 1,
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Tag (dokładny)"
            size="small"
            value={tagToEdit}
            onChange={(e) => setTagToEdit(e.target.value)}
            sx={{ width: 220 }}
          />
          <TextField
            label="Szansa"
            size="small"
            type="number"
            value={bulkEdited.probability ?? ""}
            slotProps={{
              htmlInput: {
                min: 0,
                max: 100,
              },
            }}
            onChange={(e) =>
              setBulkEdited((s) => ({
                ...s,
                probability:
                  e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            sx={{ width: 120 }}
          />
          <TextField
            label="Maks w tygodniu"
            size="small"
            type="number"
            value={bulkEdited.maxRepeats}
            slotProps={{
              htmlInput: {
                min: 0,
                max: 21,
              },
            }}
            onChange={(e) =>
              setBulkEdited((s) => ({ ...s, maxRepeats: e.target.value }))
            }
            sx={{ width: 150 }}
          />
          <TextField
            label="Maks w przedziale"
            size="small"
            type="number"
            value={bulkEdited.maxAcrossWeeks}
            slotProps={{
              htmlInput: {
                min: 0,
              },
            }}
            onChange={(e) =>
              setBulkEdited((s) => ({ ...s, maxAcrossWeeks: e.target.value }))
            }
            sx={{ width: 160 }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            mb: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <input
              type="color"
              value={bulkEdited.color || "#ffffff"}
              onChange={(e) =>
                setBulkEdited((s) => ({ ...s, color: e.target.value }))
              }
              style={{
                width: 36,
                height: 36,
                border: "none",
                cursor: "pointer",
              }}
              title="Kolor tła"
            />
            <TextField
              size="small"
              label="HEX"
              value={bulkEdited.color}
              onChange={(e) =>
                setBulkEdited((s) => ({ ...s, color: e.target.value }))
              }
              sx={{ width: 120 }}
            />
          </Box>
          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox
                  checked={bulkEdited.allowedMeals.śniadanie}
                  onChange={() =>
                    setBulkEdited((s) => ({
                      ...s,
                      allowedMeals: {
                        ...s.allowedMeals,
                        śniadanie: !s.allowedMeals.śniadanie,
                      },
                    }))
                  }
                />
              }
              label="Śniadanie"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bulkEdited.allowedMeals.obiad}
                  onChange={() =>
                    setBulkEdited((s) => ({
                      ...s,
                      allowedMeals: {
                        ...s.allowedMeals,
                        obiad: !s.allowedMeals.obiad,
                      },
                    }))
                  }
                />
              }
              label="Obiad"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={bulkEdited.allowedMeals.kolacja}
                  onChange={() =>
                    setBulkEdited((s) => ({
                      ...s,
                      allowedMeals: {
                        ...s.allowedMeals,
                        kolacja: !s.allowedMeals.kolacja,
                      },
                    }))
                  }
                />
              }
              label="Kolacja"
            />
          </FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={bulkEdited.favorite === true}
                indeterminate={bulkEdited.favorite === null}
                onChange={() =>
                  setBulkEdited((s) => ({
                    ...s,
                    favorite: s.favorite === true ? null : true,
                  }))
                }
              />
            }
            label="Ustaw jako ulubione"
          />
          <TextField
            label="Ocena"
            size="small"
            type="number"
            value={bulkEdited.rating ?? ""}
            slotProps={{
              htmlInput: {
                min: 0,
                max: 5,
              },
            }}
            onChange={(e) =>
              setBulkEdited((s) => ({
                ...s,
                rating: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            sx={{ width: 120 }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            onClick={() => {
              const tag = (tagToEdit || "").trim().toLowerCase();
              if (!tag) {
                Swal.fire({
                  icon: "warning",
                  title: "Podaj tag",
                  confirmButtonText: "OK",
                });
                return;
              }
              let changed = 0;
              dishes.forEach((dish) => {
                if (!Array.isArray(dish.tags)) return;
                if (!dish.tags.some((t) => ("" + t).toLowerCase() === tag))
                  return;
                // apply fields only if user set them (null/empty = ignore)
                if (bulkEdited.probability != null)
                  dish.probability = Number(bulkEdited.probability);
                if (bulkEdited.maxRepeats !== "")
                  dish.maxRepeats = Number(bulkEdited.maxRepeats);
                if (bulkEdited.maxAcrossWeeks !== "")
                  dish.maxAcrossWeeks = Number(bulkEdited.maxAcrossWeeks);
                if (bulkEdited.color !== "") dish.color = bulkEdited.color;
                if (bulkEdited.favorite !== null)
                  dish.favorite = !!bulkEdited.favorite;
                if (bulkEdited.rating != null)
                  dish.rating = Number(bulkEdited.rating);
                // allowedMeals always applied from checkboxes
                dish.allowedMeals = Object.keys(bulkEdited.allowedMeals).filter(
                  (m) => bulkEdited.allowedMeals[m]
                );
                changed++;
              });
              if (changed > 0) {
                saveLocal();
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
            }}
          >
            Zastosuj dla tagu
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setTagToEdit("");
              setBulkEdited({
                probability: null,
                maxRepeats: "",
                maxAcrossWeeks: "",
                allowedMeals: { śniadanie: true, obiad: true, kolacja: true },
                color: "",
                favorite: null,
                rating: null,
              });
            }}
          >
            Wyczyść
          </Button>
        </Box>
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
          variant="outlined"
          color="primary"
          onClick={() => setFilterRating(0)}
        >
          Wyczyść filtry
        </Button>
      </Box>

      <List>
        {dishes
          .filter(
            (dish) =>
              (dish.rating || 0) >= filterRating &&
              (!onlyFavorites || dish.favorite === true)
          )
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
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(index);
                      }}
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
