import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  Collapse,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";
import ReportIcon from "@mui/icons-material/Report";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PublicPotrawy() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [openIndex, setOpenIndex] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/public/dishes?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Fetch failed");
      const body = await res.json();
      setItems(body.items || []);
    } catch (err) {
      console.error("fetch public dishes:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się pobrać listy",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const toggle = (i) => setOpenIndex((prev) => (prev === i ? null : i));

  const importDish = (pd) => {
    try {
      // prevent duplicate import by name
      const current = dishesAll();
      if (current.find((d) => d.name === pd.name)) {
        Swal.fire({
          icon: "info",
          title: "Już masz tę potrawę",
          text: `Potrawa "${pd.name}" już istnieje w Twojej kolekcji.`,
        });
        return;
      }
      // if pd contains full metadata, add it
      const toAdd = {
        name: pd.name,
        tags: Array.isArray(pd.tags)
          ? pd.tags
          : pd.tags
          ? pd.tags.split(",").map((t) => t.trim())
          : [],
        params: pd.params || "",
        ingredients: Array.isArray(pd.ingredients) ? pd.ingredients : [],
        probability: pd.probability ?? 100,
        maxRepeats: pd.maxRepeats ?? 1,
        allowedMeals: pd.allowedMeals || ["śniadanie", "obiad", "kolacja"],
        rating: pd.rating ?? 0,
        favorite: !!pd.favorite,
        color: pd.color || "",
        maxAcrossWeeks: pd.maxAcrossWeeks ?? null,
      };
      addDish(toAdd);
      const currentDishes = dishesAll();
      localStorage.setItem("dishes", JSON.stringify(currentDishes));
      window.dispatchEvent(
        new CustomEvent("dishesUpdated", { detail: currentDishes })
      );

      Swal.fire({
        icon: "success",
        title: "Zaimportowano",
        text: `Potrawa "${pd.name}" została dodana.`,
      });
    } catch (err) {
      console.error("import dish:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się zaimportować potrawy.",
      });
    }
  };

  const handleReport = async (item) => {
    try {
      const { value: reason, isConfirmed } = await Swal.fire({
        title: `Zgłoś potrawę "${item.name}"`,
        input: "select",
        inputOptions: {
          spam: "Spam",
          offensive: "Obraźliwa treść",
          inappropriate: "Nieodpowiednia zawartość",
          other: "Inny powód",
        },
        inputPlaceholder: "Wybierz powód",
        showCancelButton: true,
        confirmButtonText: "Dalej",
        cancelButtonText: "Anuluj",
        inputValidator: (value) => {
          if (!value) {
            return "Musisz wybrać powód!";
          }
        },
      });

      if (!isConfirmed || !reason) return;

      const { value: details, isConfirmed: detailsConfirmed } = await Swal.fire(
        {
          title: "Szczegóły zgłoszenia (opcjonalnie)",
          input: "textarea",
          inputPlaceholder: "Opcjonalnie możesz dodać szczegóły...",
          showCancelButton: true,
          confirmButtonText: "Wyślij zgłoszenie",
          cancelButtonText: "Anuluj",
        }
      );

      if (!detailsConfirmed) return;

      const token = localStorage.getItem("token");
      if (!token) {
        Swal.fire({
          icon: "warning",
          title: "Zaloguj się",
          text: "Musisz być zalogowany aby zgłosić potrawę",
        });
        return;
      }

      const res = await fetch(`${API_BASE}/api/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "dish",
          id: item._id,
          reason,
          details,
        }),
      });

      if (!res.ok) throw new Error("Report failed");

      Swal.fire({
        icon: "success",
        title: "Zgłoszono",
        text: "Dziękujemy za zgłoszenie. Sprawdzimy tę potrawę.",
      });
    } catch (err) {
      console.error("report dish:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się zgłosić potrawy",
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Publiczne potrawy
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj..."
          size="small"
        />
        <Button variant="contained" onClick={fetchList} disabled={loading}>
          Szukaj
        </Button>
      </Box>
      <Paper sx={{ p: 2 }}>
        <List>
          {items.length === 0 && (
            <Typography>Brak publicznych potraw</Typography>
          )}
          {items.map((it, idx) => (
            <Box key={it._id || idx}>
              <ListItem divider>
                <ListItemText
                  primary={it.name}
                  secondary={it.tags?.join?.(", ") || ""}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button size="small" onClick={() => importDish(it)}>
                    Importuj
                  </Button>
                  <Button
                    size="small"
                    onClick={() =>
                      Swal.fire({
                        title: it.name,
                        html: `<pre style="text-align:left">${JSON.stringify(
                          it,
                          null,
                          2
                        )}</pre>`,
                        width: 800,
                      })
                    }
                  >
                    Szczegóły
                  </Button>
                  <Button
                    size="small"
                    startIcon={<ReportIcon />}
                    onClick={() => handleReport(it)}
                  >
                    Zgłoś
                  </Button>
                  <IconButton
                    onClick={() => toggle(idx)}
                    size="small"
                    aria-expanded={openIndex === idx}
                  >
                    <ExpandMoreIcon
                      sx={{
                        transform:
                          openIndex === idx ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </IconButton>
                </Box>
              </ListItem>
              <Collapse in={openIndex === idx} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 3, pr: 2, pb: 2 }}>
                  <Typography variant="subtitle2">Składniki:</Typography>
                  <Typography variant="body2">
                    {Array.isArray(it.ingredients) &&
                    it.ingredients.length > 0 ? (
                      <ul style={{ margin: "6px 0 0 20px" }}>
                        {it.ingredients.map((ing, i) => (
                          <li key={i}>{ing}</li>
                        ))}
                      </ul>
                    ) : (
                      "Brak składników"
                    )}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Przepis / opis:
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {it.params || "Brak opisu"}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
