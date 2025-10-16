import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  Divider,
  IconButton,
  CircularProgress,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import LockIcon from "@mui/icons-material/Lock";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import Swal from "sweetalert2";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UstawieniaKonta() {
  const [loading, setLoading] = useState(false);
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
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    setEmail(user.email || "");
    setUsername(user.username || "");
    setAvatarPreview(user?.settings?.avatar || user?.avatar || null);
  }, [user]);

  // resolve avatar src: jeśli to pełny URL użyj go, jeśli relatywny (/uploads/...) dołącz API_BASE
  const resolvedAvatarSrc = avatarPreview
    ? avatarPreview.startsWith("http") || avatarPreview.startsWith("data:")
      ? avatarPreview
      : `${API_BASE}${avatarPreview}`
    : null;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const saveAccountChanges = async () => {
    // update email/username via PATCH /api/user (best-effort)
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          email: email || null,
          username: username || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || "Update failed");
      }
      // update local copy if server accepted changes
      const updated = { ...user, email, username };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));
      Swal.fire({
        icon: "success",
        title: "Zapisano",
        text: "Dane konta zaktualizowane.",
      });
    } catch (err) {
      console.error("saveAccountChanges:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || "Nie udało się zaktualizować.",
      });
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Wypełnij oba pola hasła.",
      });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: "Nowe hasła nie są identyczne.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || res.statusText || "Password change failed"
        );
      }
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      Swal.fire({
        icon: "success",
        title: "Zapisano",
        text: "Hasło zostało zmienione.",
      });
    } catch (err) {
      console.error("changePassword:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || "Nie udało się zmienić hasła.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFile = async (file) => {
    if (!file) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: "POST",
        headers: { ...getAuthHeaders() }, // nie ustawiaj Content-Type
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText || "Avatar upload failed");
      }

      // helper: usuń "normal" i smart quotes z początku/końca
      const stripQuotes = (s) =>
        (s || "")
          .toString()
          .trim()
          .replace(
            /^[\u0022\u0027\u2018\u2019\u201C\u201D]+|[\u0022\u0027\u2018\u2019\u201C\u201D]+$/g,
            ""
          );

      const body = await res.json();

      const path = stripQuotes(body.path);
      const url = stripQuotes(body.url);
      const fullUrl = url || (path ? `${API_BASE}${path}` : null);

      if (!fullUrl) throw new Error("Brak URL do avatara w odpowiedzi serwera");

      // preview: pełny URL + cache-bust
      setAvatarPreview(`${fullUrl}?t=${Date.now()}`);

      // zapisz w localStorage tylko ścieżkę (bez cudzysłowów)
      const updated = {
        ...user,
        data: {
          ...(user.data || {}),
          settings: { ...(user.data?.settings || {}), avatar: path },
        },
        settings: { ...(user.settings || {}), avatar: path },
      };

      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));
      Swal.fire({
        icon: "success",
        title: "Zapisano",
        text: "Avatar zapisany.",
      });
    } catch (err) {
      console.error("handleAvatarFile:", err);
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || "Nie udało się zapisać avatara.",
      });
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
    } catch {
      // ignore network error but still clear local data
    } finally {
      localStorage.clear();
      window.dispatchEvent(new CustomEvent("userLoggedOut"));
      Swal.fire({
        icon: "success",
        title: "Usunięto",
        text: "Konto zostało usunięte.",
      }).then(() => window.location.reload());
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Ustawienia konta
      </Typography>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <Avatar
          src={resolvedAvatarSrc}
          sx={{ width: 80, height: 80, bgcolor: "primary.main" }}
        >
          {!avatarPreview && (username?.charAt(0) || "U").toUpperCase()}
        </Avatar>
        <Box>
          <input
            accept="image/*"
            id="avatar-file"
            type="file"
            style={{ display: "none" }}
            onChange={(e) => handleAvatarFile(e.target.files?.[0])}
          />
          <label htmlFor="avatar-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PhotoCameraIcon />}
              disabled={avatarUploading}
            >
              {avatarUploading ? "Wysyłanie..." : "Zmień avatar"}
            </Button>
          </label>
          <Button
            sx={{ ml: 1 }}
            onClick={() => {
              setAvatarPreview(null);
              // remove avatar from user data
              (async () => {
                setAvatarUploading(true);
                try {
                  // call DELETE /api/user/avatar to remove file and clear DB path
                  const res = await fetch(`${API_BASE}/api/user/avatar`, {
                    method: "DELETE",
                    headers: { ...getAuthHeaders() },
                  });
                  if (!res.ok) throw new Error("Nie udało się usunąć avatara");
                  const updated = {
                    ...user,
                    settings: { ...(user.settings || {}), avatar: null },
                  };
                  localStorage.setItem("user", JSON.stringify(updated));
                  setUser(updated);
                  window.dispatchEvent(
                    new CustomEvent("userUpdated", { detail: updated })
                  );
                } catch (err) {
                  console.error(err);
                  Swal.fire({
                    icon: "error",
                    title: "Błąd",
                    text: "Nie udało się usunąć avatara.",
                  });
                } finally {
                  setAvatarUploading(false);
                }
              })();
            }}
            disabled={avatarUploading}
          >
            Usuń
          </Button>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Dane konta
      </Typography>

      <Box
        sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr", mb: 2 }}
      >
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
        />
        <TextField
          label="Nazwa użytkownika"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={saveAccountChanges}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Zapisz zmiany"
          )}
        </Button>
        <Button
          color="error"
          startIcon={<DeleteForeverIcon />}
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          Usuń konto
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Zmiana hasła
      </Typography>

      <Box
        sx={{ display: "grid", gap: 2, gridTemplateColumns: "1fr 1fr", mb: 2 }}
      >
        <TextField
          label="Aktualne hasło"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          fullWidth
        />
        <TextField
          label="Nowe hasło"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          fullWidth
        />
        <TextField
          label="Potwierdź nowe hasło"
          type="password"
          value={newPasswordConfirm}
          onChange={(e) => setNewPasswordConfirm(e.target.value)}
          fullWidth
          sx={{ gridColumn: "1 / 3" }}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<LockIcon />}
          onClick={changePassword}
          disabled={loading}
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            "Zmień hasło"
          )}
        </Button>
      </Box>
    </Box>
  );
}
