import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Chip,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import dishes from "../js/potrawy";
import Swal from "sweetalert2";

const STORAGE_KEY = "dishLists";

export default function Listy() {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setLists(JSON.parse(raw));
      } catch {
        setLists([]);
      }
    }
  }, []);

  const save = (next) => {
    setLists(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const createList = () => {
    const name = (newName || "").trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Podaj nazwę listy" });
      return;
    }
    const id = Date.now().toString();
    const next = [...lists, { id, name, dishes: [] }];
    save(next);
    setNewName("");
  };

  const removeList = (id) => {
    Swal.fire({
      title: "Usunąć listę?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    }).then((r) => {
      if (r.isConfirmed) save(lists.filter((l) => l.id !== id));
    });
  };

  const onDragStart = (e, dishName) => {
    e.dataTransfer.setData("text/plain", dishName);
  };

  const onDropToList = (e, listId) => {
    e.preventDefault();
    const dishName = e.dataTransfer.getData("text/plain");
    if (!dishName) return;
    const next = lists.map((l) => {
      if (l.id !== listId) return l;
      if (l.dishes.includes(dishName)) return l;
      return { ...l, dishes: [...l.dishes, dishName] };
    });
    save(next);
  };

  const onRemoveDishFromList = (listId, name) => {
    const next = lists.map((l) =>
      l.id === listId ? { ...l, dishes: l.dishes.filter((d) => d !== name) } : l
    );
    save(next);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Listy potraw
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Nazwa listy"
          size="small"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button variant="contained" onClick={createList}>
          Dodaj listę
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <Paper sx={{ p: 2, minWidth: 240, maxWidth: 360 }}>
          <Typography variant="subtitle1">Wszystkie potrawy</Typography>
          <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
            {dishes.map((d, i) => (
              <Chip
                key={i}
                label={d.name}
                draggable
                onDragStart={(e) => onDragStart(e, d.name)}
                variant="outlined"
                sx={{ cursor: "grab" }}
              />
            ))}
          </Box>
        </Paper>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {lists.map((l) => (
            <Paper
              key={l.id}
              sx={{
                p: 2,
                minWidth: 220,
                maxWidth: 360,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropToList(e, l.id)}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle1">{l.name}</Typography>
                <IconButton size="small" onClick={() => removeList(l.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {l.dishes.length === 0 && (
                  <Typography variant="body2">Brak potraw</Typography>
                )}
                {l.dishes.map((dn) => (
                  <Chip
                    key={dn}
                    label={dn}
                    onDelete={() => onRemoveDishFromList(l.id, dn)}
                  />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
