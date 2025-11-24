import React, { useEffect, useState } from "react";
import { Box, Typography, Button, TextField, List } from "@mui/material";
import Swal from "sweetalert2";
import dishesAll, { addDish } from "../js/potrawy";
import PublicDishCard from "./publicDishCard";
import Switch from "@mui/material/Switch";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function PublicPotrawy() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [likedIds, setLikedIds] = useState([]); // ids liked by current user
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const fetchLikes = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setLikedIds([]);
    try {
      const res = await fetch(`${API_BASE}/api/user/likes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No likes");
      const body = await res.json();
      setLikedIds(body.likedIds || []);
    } catch (err) {
      console.warn("fetchLikes:", err);
      setLikedIds([]);
    }
  };

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/public/dishes?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error("Fetch failed");
      const body = await res.json();
      // attach likesCount from backend if present, otherwise 0
      const enriched = (body.items || []).map((it) => ({
        ...it,
        likesCount: Array.isArray(it.likes)
          ? it.likes.length
          : it.likesCount || 0,
      }));
      setItems(enriched);
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
    fetchLikes();
  }, []);

  const handleToggleLike = async (dish) => {
    const token = localStorage.getItem("token");
    if (!token) {
      Swal.fire({
        icon: "warning",
        title: "Zaloguj się",
        text: "Musisz być zalogowany, aby polubić potrawę",
      });
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/public/dishes/${dish._id}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Like failed");
      const body = await res.json();
      // update likedIds
      setLikedIds((prev) => {
        if (body.liked) return [...prev, dish._id];
        return prev.filter((id) => id !== dish._id);
      });
      // update local likesCount
      setItems((prev) =>
        prev.map((it) =>
          it._id === dish._id ? { ...it, likesCount: body.likesCount } : it
        )
      );
    } catch (err) {
      console.error("toggle like:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nie udało się zaktualizować polubienia",
      });
    }
  };

  const visibleItems = onlyFavorites
    ? items.filter((it) => likedIds.includes(it._id))
    : items;

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
        avatar: pd.avatar || "",
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

      <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj..."
          size="small"
        />
        <Button
          variant="contained"
          className="primary"
          onClick={fetchList}
          disabled={loading}
        >
          Szukaj
        </Button>

        <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
          <Switch
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
            inputProps={{ "aria-label": "Tylko ulubione" }}
          />
          <Typography variant="body2">Tylko ulubione</Typography>
        </Box>
      </Box>

      <List>
        {visibleItems.length === 0 && (
          <Typography>Brak publicznych potraw</Typography>
        )}
        {visibleItems.map((it, idx) => (
          <Box key={it._id || idx} sx={{ mb: 2 }}>
            <PublicDishCard
              dishData={it}
              onAddToDishes={importDish}
              onReport={handleReport}
              liked={likedIds.includes(it._id)}
              likesCount={it.likesCount ?? 0}
              onToggleLike={handleToggleLike}
            />
          </Box>
        ))}
      </List>
    </Box>
  );
}
