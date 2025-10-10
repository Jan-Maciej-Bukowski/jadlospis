import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Swal from "sweetalert2";
import dishesAll from "../js/potrawy";

export default function Jadlospisy() {
  const [saved, setSaved] = useState([]);
  const fileRef = useRef(null);
  useEffect(() => {
    const raw = localStorage.getItem("savedMenus");
    try {
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  }, []);

  const refresh = () => {
    const raw = localStorage.getItem("savedMenus");
    try {
      setSaved(raw ? JSON.parse(raw) : []);
    } catch {
      setSaved([]);
    }
  };

  const saveAll = (next) => {
    setSaved(next);
    localStorage.setItem("savedMenus", JSON.stringify(next));
  };

  const handleDelete = (id) => {
    Swal.fire({
      title: "Usuń zapisany jadłospis?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    }).then((r) => {
      if (!r.isConfirmed) return;
      const next = saved.filter((s) => s.id !== id);
      saveAll(next);
    });
  };

  const handleRename = async (item) => {
    const { value } = await Swal.fire({
      title: "Zmień nazwę",
      input: "text",
      inputValue: item.name,
      showCancelButton: true,
    });
    if (!value) return;
    const next = saved.map((s) =>
      s.id === item.id ? { ...s, name: value } : s
    );
    saveAll(next);
  };

  const handleExportOne = (item) => {
    // export only this saved menu (include minimal dishes used)
    const toExport = item.menu || [];
    const used = new Set();
    const placeholder = "Brak potraw";
    const flatDays = Array.isArray(toExport[0]) ? toExport.flat() : toExport;
    flatDays.forEach((entry) =>
      ["śniadanie", "obiad", "kolacja"].forEach((m) => {
        const d = entry?.[m];
        const name = d?.name ?? d;
        if (!name) return;
        if (name === placeholder) return;
        used.add(name);
      })
    );
    const dishes = Array.from(used).map((n) => {
      const d = dishesAll.find((x) => x.name === n);
      return (
        d || {
          name: n,
        }
      );
    });
    const out = {
      meta: { createdAt: item.createdAt, source: "jadlospis-saved" },
      name: item.name,
      menu: item.menu,
      dishes,
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jadlospis_${item.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    Swal.fire({
      icon: "success",
      title: "Wyeksportowano",
      showConfirmButton: false,
      timer: 900,
    });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        // expect { menu, name? }
        if (!parsed || !parsed.menu || !Array.isArray(parsed.menu)) {
          throw new Error("Nieprawidłowy format");
        }
        const name =
          parsed.name || `Import ${new Date().toISOString().slice(0, 10)}`;
        const id = Date.now().toString();
        const next = [
          ...saved,
          { id, name, menu: parsed.menu, createdAt: new Date().toISOString() },
        ];
        saveAll(next);
        Swal.fire({
          icon: "success",
          title: "Zaimportowano",
          text: `Zapisano jako "${name}"`,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Błąd importu",
          text: "Plik ma nieprawidłowy format",
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleLoadIntoPlanner = (item) => {
    // zapis jako "pending" — jeśli komponent Jadłospis jest odmontowany,
    // zostanie wczytany przy następnym jego mountcie; dodatkowo dispatchujemy event
    // dla przypadku, gdy jest zamontowany teraz.
    try {
      localStorage.setItem("pendingMenu", JSON.stringify(item.menu));
    } catch (err) {
      console.warn("Nie udało się zapisać pendingMenu", err);
    }
    window.dispatchEvent(
      new CustomEvent("loadSavedMenu", { detail: item.menu })
    );
    Swal.fire({
      icon: "success",
      title: "Załadowano",
      text: "Jeśli nie widzisz zmian, przejdź do sekcji Jadłospis — jadłospis będzie gotowy.",
      showConfirmButton: false,
      timer: 900,
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Zapisane jadłospisy
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="contained"
          onClick={() => {
            // quick export all saved menus
            const blob = new Blob([JSON.stringify(saved, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `saved_jadlospisy_${new Date()
              .toISOString()
              .slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            Swal.fire({
              icon: "success",
              title: "Wyeksportowano wszystkie",
              showConfirmButton: false,
              timer: 900,
            });
          }}
        >
          Eksportuj wszystkie
        </Button>

        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileRef.current?.click()}
        >
          Importuj jadłospis
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </Box>

      <Paper sx={{ p: 2 }}>
        {saved.length === 0 && (
          <Typography variant="body2">Brak zapisanych jadłospisów</Typography>
        )}
        <List>
          {saved.map((s) => (
            <ListItem
              key={s.id}
              secondaryAction={
                <Box>
                  <IconButton
                    edge="end"
                    onClick={() => handleLoadIntoPlanner(s)}
                    title="Załaduj"
                  >
                    <CloudDownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleRename(s)}
                    title="Zmień nazwę"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleExportOne(s)}
                    title="Eksportuj"
                  >
                    <CloudDownloadIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(s.id)}
                    title="Usuń"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={s.name}
                secondary={new Date(s.createdAt).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
