import React, { useState } from "react";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Swal from "sweetalert2";

export default function Logowanie({ onLogged }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
    /\/+$/,
    ""
  );

  // helper tworzący poprawny URL niezależnie od trailing slash
  const makeUrl = (path) => new URL(path, API).toString();

  const clear = () => {
    setEmail("");
    setUsername("");
    setPassword("");
  };

  const applyUserData = (data) => {
    // oczekiwane pola: dishes, dishLists, lastMenu, savedMenus, settings
    try {
      if (!data) return;
      if (data.dishes) {
        localStorage.setItem("dishes", JSON.stringify(data.dishes));
        window.dispatchEvent(
          new CustomEvent("dishesUpdated", { detail: data.dishes })
        );
      }
      if (data.dishLists) {
        localStorage.setItem("dishLists", JSON.stringify(data.dishLists));
        window.dispatchEvent(
          new CustomEvent("dishListsUpdated", { detail: data.dishLists })
        );
      }
      if (data.lastMenu !== undefined) {
        localStorage.setItem("lastMenu", JSON.stringify(data.lastMenu));
        window.dispatchEvent(
          new CustomEvent("lastMenuUpdated", { detail: data.lastMenu })
        );
      }
      if (data.savedMenus) {
        localStorage.setItem("savedMenus", JSON.stringify(data.savedMenus));
        window.dispatchEvent(
          new CustomEvent("savedMenusUpdated", { detail: data.savedMenus })
        );
      }
      if (data.settings) {
        localStorage.setItem("settings", JSON.stringify(data.settings));
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", { detail: data.settings })
        );
      }
    } catch (err) {
      console.warn("applyUserData error", err);
    }
  };

  const fetchUserData = async (token) => {
    try {
      const res = await fetch(`${API}/api/user/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const body = await res.json();
      return body.data;
    } catch {
      return null;
    }
  };

  const handleRegister = async () => {
    try {
      // register
      const res = await fetch(makeUrl("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
      if (!res.ok) throw new Error(body.error || "Błąd rejestracji");
      localStorage.setItem("token", body.token);
      localStorage.setItem("user", JSON.stringify(body.user));
      const data = body.userData ?? (await fetchUserData(body.token));
      applyUserData(data);

      // IMPORTANT: oznacz userSync, że localStorage odpowiada serwerowi (lastHash)
      try {
        window.dispatchEvent(
          new CustomEvent("userSync:setLastHash", { detail: data })
        );
      } catch (e) {
        console.debug("could not dispatch userSync:setLastHash", e);
      }

      window.dispatchEvent(
        new CustomEvent("userLoggedIn", { detail: body.user })
      );
      Swal.fire({
        icon: "success",
        title: "Zarejestrowano",
        text: `Witaj, ${body.user.username}`,
      });
      clear();
      if (onLogged) onLogged(body.user);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || String(err),
      });
    }
  };

  const handleLogin = async () => {
    try {
      // login
      const res = await fetch(makeUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: email || username, password }),
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text };
      }
      if (!res.ok) throw new Error(body.error || "Błąd logowania");
      localStorage.setItem("token", body.token);
      localStorage.setItem("user", JSON.stringify(body.user));
      const data = body.userData ?? (await fetchUserData(body.token));
      applyUserData(data);

      // IMPORTANT: oznacz userSync, że localStorage odpowiada serwerowi (lastHash)
      try {
        window.dispatchEvent(
          new CustomEvent("userSync:setLastHash", { detail: data })
        );
      } catch (e) {
        console.debug("could not dispatch userSync:setLastHash", e);
      }

      window.dispatchEvent(
        new CustomEvent("userLoggedIn", { detail: body.user })
      );
      Swal.fire({
        icon: "success",
        title: "Zalogowano",
        text: `Witaj, ${body.user.username}`,
      });
      clear();
      if (onLogged) onLogged(body.user);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Błąd",
        text: err.message || String(err),
      });
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, maxWidth: 520 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <AccountCircleIcon fontSize="large" />
          <Typography variant="h5">
            {mode === "login" ? "Logowanie" : "Rejestracja"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={
              mode === "register" ? "Email" : "Email lub nazwa użytkownika"
            }
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            size="small"
            fullWidth
          />
          {mode === "register" && (
            <TextField
              label="Nazwa użytkownika"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small"
              fullWidth
            />
          )}
          <TextField
            label="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            size="small"
            fullWidth
          />
          {mode === "register" ? (
            <>
              <Button variant="contained" onClick={handleRegister}>
                Zarejestruj
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setMode("login");
                  clear();
                }}
              >
                Masz już konto? Zaloguj się
              </Button>
            </>
          ) : (
            <>
              <Button variant="contained" onClick={handleLogin}>
                Zaloguj
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setMode("register");
                  clear();
                }}
              >
                Nie masz konta? Zarejestruj się
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
