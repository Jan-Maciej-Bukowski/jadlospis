import React, { useState } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Chip,
  Divider,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/CloudDownload";
import PrintIcon from "@mui/icons-material/Print";
import { getAllDishes } from "../js/potrawy";

/**
 * Lista zakupów: generuje listę składników na podstawie aktualnego jadłospisu
 * czytanego z localStorage.lastMenu (kompatybilne z single- i multi-week).
 */
export default function ListaZakupow() {
  const [items, setItems] = useState([]); // [{name, count, checked}]
  const [missing, setMissing] = useState([]); // potrawy bez składników
  const [generatedAt, setGeneratedAt] = useState(null);

  const readLastMenu = () => {
    try {
      const raw = localStorage.getItem("lastMenu");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const normalizeIngredient = (s) =>
    ("" + s).replace(/\s+/g, " ").trim().toLowerCase();

  const generate = () => {
    const menu = readLastMenu();
    if (!menu || !Array.isArray(menu) || menu.length === 0) {
      setItems([]);
      setMissing([]);
      setGeneratedAt(null);
      return;
    }

    const flat = Array.isArray(menu[0]) ? menu.flat() : menu;
    const counts = new Map();
    const missingSet = new Set();

    // Make sure dishesAll is an array
    const dishes = getAllDishes();

    flat.forEach((day) =>
      ["śniadanie", "obiad", "kolacja"].forEach((meal) => {
        const d = day?.[meal];
        const name = d?.name ?? d;
        if (!name) return;
        const dishObj = dishes.find((x) => x.name === name);
        if (
          !dishObj ||
          !Array.isArray(dishObj.ingredients) ||
          dishObj.ingredients.length === 0
        ) {
          missingSet.add(name);
          return;
        }
        dishObj.ingredients.forEach((ing) => {
          const key = normalizeIngredient(ing);
          if (!key) return;
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      })
    );

    // convert map -> sorted array (alphabetically)
    const list = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count, checked: false }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );

    setItems(list);
    setMissing(Array.from(missingSet));
    setGeneratedAt(new Date().toISOString());
  };

  const toggleChecked = (idx) => {
    setItems((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], checked: !next[idx].checked };
      return next;
    });
  };

  const copyToClipboard = async () => {
    const text = items
      .map((it) => `- ${it.name}${it.count > 1 ? ` (x${it.count})` : ""}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Skopiowano do schowka");
    } catch {
      alert("Kopiowanie nie powiodło się");
    }
  };

  const exportTxt = () => {
    const content =
      `Lista zakupów\nWygenerowano: ${new Date().toLocaleString()}\n\n` +
      items
        .map((it) => `- ${it.name}${it.count > 1 ? ` (x${it.count})` : ""}`)
        .join("\n") +
      (missing.length
        ? `\n\nUwaga - brak składników dla potraw:\n- ${missing.join("\n- ")}`
        : "");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista_zakupow_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    const html = `<pre style="font-family: sans-serif; font-size: 14px;">Lista zakupów\nWygenerowano: ${new Date().toLocaleString()}\n\n${items
      .map((it) => `- ${it.name}${it.count > 1 ? ` (x${it.count})` : ""}`)
      .join("\n")}${
      missing.length
        ? `\n\nUwaga - brak składników dla potraw:\n- ${missing.join("\n- ")}`
        : ""
    }</pre>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  const clearChecks = () =>
    setItems((prev) => prev.map((it) => ({ ...it, checked: false })));

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ mr: 1 }}>
          Lista zakupów
        </Typography>
        <Button
          variant="contained"
          startIcon={<ShoppingCartIcon />}
          onClick={generate}
        >
          Generuj listę zakupów
        </Button>
        <Button
          variant="contained" // zmiana z outlined na contained
          startIcon={<ContentCopyIcon />}
          onClick={copyToClipboard}
          disabled={!items.length}
        >
          Kopiuj
        </Button>
        <Button
          variant="contained" // zmiana z outlined na contained
          startIcon={<DownloadIcon />}
          onClick={exportTxt}
          disabled={!items.length}
        >
          Eksportuj .txt
        </Button>
        <Button
          variant="contained" // zmiana z outlined na contained
          startIcon={<PrintIcon />}
          onClick={printList}
          disabled={!items.length}
        >
          Drukuj
        </Button>
        <Button variant="text" onClick={clearChecks} disabled={!items.length}>
          Wyczyść zaznaczenia
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Wygenerowano:{" "}
          {generatedAt ? new Date(generatedAt).toLocaleString() : "—"}
        </Typography>

        <Divider sx={{ mb: 1 }} />

        {items.length === 0 ? (
          <Typography variant="body2">
            Brak pozycji. Kliknij "Generuj listę zakupów".
          </Typography>
        ) : (
          <List>
            {items.map((it, i) => (
              <ListItem
                key={it.name}
                secondaryAction={
                  <Chip label={it.count > 1 ? `x${it.count}` : ""} />
                }
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={!!it.checked}
                    onChange={() => toggleChecked(i)}
                  />
                </ListItemIcon>
                <ListItemText primary={it.name} />
              </ListItem>
            ))}
          </List>
        )}

        {missing.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">
              Uwaga — brak składników dla potraw:
            </Typography>
            <Typography variant="body2">{missing.join(", ")}</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
