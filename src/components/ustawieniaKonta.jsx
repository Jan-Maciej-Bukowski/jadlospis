import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  Divider,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import Swal from "sweetalert2";
import { stripQuotes } from "../utils/stripQuotes";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UstawieniaKonta() {
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      return {};
    }
  });

  const [email, setEmail] = useState(user.email || "");
  const [username, setUsername] = useState(user.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(
    user?.settings?.avatar || user?.avatar || null
  );

  useEffect(() => {
    setEmail(user.email || "");
    setUsername(user.username || "");
    setAvatarPreview(user?.settings?.avatar || user?.avatar || null);
  }, [user]);

  const resolvedAvatarSrc =
    avatarPreview && (avatarPreview.startsWith("http") || avatarPreview.startsWith("data:"))
      ? avatarPreview
      : avatarPreview
      ? `${API_BASE}${avatarPreview}`
      : null;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // -------------------------------
  // 🔹 ZAPISZ ZMIANY KONTA
  // -------------------------------
  const saveAccountChanges = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ email, username }),
      });
      if (!res.ok) throw new Error("Nie udało się zaktualizować danych.");

      const updated = { ...user, email, username };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));

      Swal.fire({ icon: "success", title: "Zapisano", text: "Dane konta zaktualizowane." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Błąd", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // 🔹 ZMIANA HASŁA
  // -------------------------------
  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      return Swal.fire({ icon: "error", title: "Błąd", text: "Wypełnij oba pola hasła." });
    }
    if (newPassword !== newPasswordConfirm) {
      return Swal.fire({ icon: "error", title: "Błąd", text: "Nowe hasła nie są identyczne." });
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error("Nie udało się zmienić hasła.");

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      Swal.fire({ icon: "success", title: "Zmieniono", text: "Hasło zostało zmienione." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Błąd", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // 🔹 AVATAR
  // -------------------------------
  const handleAvatarFile = async (file) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: form,
      });
      if (!res.ok) throw new Error("Nie udało się przesłać avatara.");

      const body = await res.json();
      const path = stripQuotes(body.path);
      const updated = {
        ...user,
        avatar: path,
        settings: { ...(user.settings || {}), avatar: path },
      };

      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      setAvatarPreview(path);
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));

      Swal.fire({ icon: "success", title: "Zapisano", text: "Avatar zapisany." });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Błąd", text: err.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const answer = await Swal.fire({
      title: "Usuń konto?",
      text: "To działanie jest nieodwracalne.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/user`, {
        method: "DELETE",
        headers: { ...getAuthHeaders() },
      });
    } catch {}
    finally {
      localStorage.clear();
      window.dispatchEvent(new CustomEvent("userLoggedOut"));
      Swal.fire({ icon: "success", title: "Usunięto", text: "Konto zostało usunięte." })
        .then(() => window.location.reload());
      setLoading(false);
    }
  };

  const clearAppData = async () => {
    const answer = await Swal.fire({
      title: "Wyczyścić dane aplikacji?",
      text: "Usunie zapisane potrawy, jadłospisy i listy. Konto pozostanie bez zmian.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Wyczyść",
    });
    if (!answer.isConfirmed) return;

    try {
      const userRaw = localStorage.getItem("user");
      const tokenRaw = localStorage.getItem("token");

      const keysToReset = [
        "dishes",
        "dishLists",
        "lastMenu",
        "savedMenus",
        "publishedDishes",
        "publishedMenus",
      ];

      keysToReset.forEach((k) => localStorage.removeItem(k));
      ["dishes", "dishLists", "savedMenus"].forEach((k) =>
        localStorage.setItem(k, JSON.stringify([]))
      );
      localStorage.setItem("lastMenu", JSON.stringify(null));

      if (userRaw) localStorage.setItem("user", userRaw);
      if (tokenRaw) localStorage.setItem("token", tokenRaw);

      ["dishes", "dishLists", "savedMenus", "lastMenu"].forEach((e) =>
        window.dispatchEvent(new CustomEvent(`${e}Updated`, { detail: [] }))
      );

      Swal.fire({ icon: "success", title: "Wyczyszczono", text: "Dane aplikacji usunięte." });
    } catch (err) {
      console.err(err);
      Swal.fire({ icon: "error", title: "Błąd", text: "Nie udało się wyczyścić danych." });
    }
  };

  // -------------------------------
  // 🔹 UI
  // -------------------------------
  return (
    <Box sx={{ maxWidth: 720, mx: "auto", p: 3 }}>
      {/* 🔸 Nagłówek */}
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Ustawienia konta
      </Typography>

      {/* 🔸 Avatar */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Avatar
            src={resolvedAvatarSrc}
            sx={{ width: 90, height: 90, bgcolor: "primary.main", fontSize: 28 }}
          >
            {!avatarPreview && (username?.charAt(0) || "U").toUpperCase()}
          </Avatar>

          <Stack spacing={1}>
            <input
              accept="image/*"
              id="avatar-file"
              type="file"
              hidden
              onChange={(e) => handleAvatarFile(e.target.files?.[0])}
            />
            <label htmlFor="avatar-file">
              <Button
                variant="contained"
                className="primary"
                startIcon={<PhotoCameraIcon />}
                component="span"
                disabled={avatarUploading}
              >
                {avatarUploading ? "Wysyłanie..." : "Zmień avatar"}
              </Button>
            </label>
            <Button
              variant="outlined"
              color="error"
              disabled={avatarUploading}
              onClick={() => handleAvatarFile(null)}
            >
              Usuń avatar
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* 🔸 Dane konta */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Dane konta
        </Typography>
        <Stack spacing={2}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Nazwa użytkownika"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button
            variant="contained"
            className="primary"
            startIcon={<SaveIcon />}
            onClick={saveAccountChanges}
            disabled={loading}
            sx={{ alignSelf: "flex-start", mt: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Zapisz zmiany"}
          </Button>
        </Stack>
      </Paper>

      {/* 🔸 Zmiana hasła */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Zmiana hasła
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Aktualne hasło"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="Nowe hasło"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Potwierdź nowe hasło"
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
          />
          <Button
            variant="contained"
            className="primary"
            color="primary"
            startIcon={<LockIcon />}
            onClick={changePassword}
            disabled={loading}
            sx={{ alignSelf: "flex-start", mt: 1 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : "Zmień hasło"}
          </Button>
        </Stack>
      </Paper>

      {/* 🔸 Groźna strefa */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "error.main",
          backgroundColor: "error.lighter",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "error.main",
            fontWeight: 700,
            mb: 2,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          Groźna strefa
        </Typography>

        <Divider sx={{ borderColor: "error.main", opacity: 0.4, mb: 3 }} />

        <Stack spacing={2}>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={handleDeleteAccount}
            disabled={loading}
          >
            Usuń konto
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<DeleteSweepIcon />}
            onClick={clearAppData}
            disabled={loading}
          >
            Wyczyść dane aplikacji
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
