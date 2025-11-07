import React, { useState, useEffect } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItem,
  Divider,
  Button,
  TextField,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SaveIcon from "@mui/icons-material/Save";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import SettingsIcon from "@mui/icons-material/Settings";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import PublicIcon from "@mui/icons-material/Public";
import GoogleIcon from "@mui/icons-material/Google";
const API = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(
  /\/+$/,
  ""
);

import Jadlospis from "./jadlospis";
import Jadlospisy from "./jadlospisy";
import PublicJadlospisy from "./publicJadlospisy";
import PublicPotrawy from "./publicPotrawy";
import Potrawy from "./potrawy";
import DodajPotrawe from "./dodajPotrawe";
import Listy from "./listy";
import ListaZakupow from "./listaZakupow";
import UstawieniaKonta from "./ustawieniaKonta";
import Ustawienia from "./ustawienia";
import Logowanie from "./logowanie";
import Swal from "sweetalert2";
import logoImg from "../assets/logo.png";

export default function Navbar() {
  // podstawowe stany komponentu
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Jadłospis");
  const [authMode, setAuthMode] = useState("login");
  const [customHexInput, setCustomHexInput] = useState("");
  const [isLogged, setIsLogged] = useState(() => {
    try {
      return !!localStorage.getItem("token");
    } catch {
      return false;
    }
  });

  // Helper do budowania URL avatara
  const buildAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http")) return avatarPath; // URL Google
    // Dla ścieżek lokalnych (/uploads/...) dodaj bazowy URL API
    return `${API}${avatarPath}`;
  };

  // Zmodyfikuj useState dla userAvatarSrc
  const [userAvatarSrc, setUserAvatarSrc] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return buildAvatarUrl(user.avatar);
    } catch {
      return null;
    }
  });

  // nasłuchuj zmian w danych użytkownika (login/logout/avatar)
  useEffect(() => {
    const onLogin = () => setIsLogged(true);
    const onLogout = () => setIsLogged(false);
    const onUserUpdated = (e) => {
      const user = e.detail || {};
      setUserAvatarSrc(user.avatar || null);
    };

    window.addEventListener("userLoggedIn", onLogin);
    window.addEventListener("userLoggedOut", onLogout);
    window.addEventListener("userUpdated", onUserUpdated);

    return () => {
      window.removeEventListener("userLoggedIn", onLogin);
      window.removeEventListener("userLoggedOut", onLogout);
      window.removeEventListener("userUpdated", onUserUpdated);
    };
  }, []);

  // obsługa OAuth callback token
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("token");
        if (!t) return;

        localStorage.setItem("token", t);

        // pobierz dane użytkownika
        try {
          const me = await fetch(`${API}/api/user/me`, {
            headers: { Authorization: `Bearer ${t}` },
          }).then((r) => (r.ok ? r.json() : null));

          const data = await fetch(`${API}/api/user/data`, {
            headers: { Authorization: `Bearer ${t}` },
          }).then((r) => (r.ok ? r.json() : null));

          const user = (me && me.user) || {
            id: null,
            username: null,
            email: null,
            avatar: null,
          };
          const mergedUser = { ...user, data: data?.data || {} };
          localStorage.setItem("user", JSON.stringify(mergedUser));
          setUserAvatarSrc(buildAvatarUrl(user.avatar));

          window.dispatchEvent(
            new CustomEvent("userUpdated", { detail: mergedUser })
          );
          window.dispatchEvent(
            new CustomEvent("userLoggedIn", { detail: mergedUser })
          );

          // usuń token z URL
          params.delete("token");
          const newUrl =
            window.location.pathname +
            (params.toString() ? `?${params.toString()}` : "");
          window.history.replaceState({}, "", newUrl);
        } catch (e) {
          console.warn("OAuth postprocessing failed", e);
        }
      } catch (e) {}
    })();
  }, []);

  const handleCustomColorApply = () => {
    const v = (customHexInput || "").trim();
    if (!/^#([0-9A-Fa-f]{6})$/.test(v)) {
      Swal.fire({
        icon: "error",
        title: "Nieprawidłowy HEX",
        text: "Podaj kolor w formacie #RRGGBB",
      });
      return;
    }
    updateCustomColor(v);
    changeTheme("custom");
    Swal.fire({
      icon: "success",
      title: "Zastosowano",
      text: `Kolor ${v} ustawiony`,
    });
  };

  const menuGroups = [
    { items: ["Jadłospis", "Jadłospisy"] },
    { items: ["Potrawy", "Dodaj potrawę", "Listy potraw", "Lista zakupów"] },
    { items: ["Publiczne jadłospisy", "Publiczne potrawy"] },
    { items: ["Ustawienia"] },
  ];

  const iconFor = (text) => {
    switch (text) {
      case "Jadłospis":
        return <CalendarTodayIcon />;
      case "Jadłospisy":
        return <SaveIcon />;
      case "Publiczne jadłospisy":
        return <PublicIcon />;
      case "Publiczne potrawy":
        return <PublicIcon />;
      case "Potrawy":
        return <RestaurantMenuIcon />;
      case "Dodaj potrawę":
        return <AddCircleOutlineIcon />;
      case "Listy potraw":
        return <FormatListBulletedIcon />;
      case "Lista zakupów":
        return <ShoppingCartIcon />;
      case "Ustawienia":
        return <SettingsIcon />;
      default:
        return <MenuIcon />;
    }
  };

  const handleMenuClick = (text) => {
    setActiveSection(text);
    // ensure focus is removed before closing drawer to avoid aria-hidden warning
    try {
      document.activeElement instanceof HTMLElement &&
        document.activeElement.blur();
    } catch {}
    setOpen(false);
  };

  // helpers to close drawers with blur (fix aria-hidden focus issue)
  const closeLeftDrawer = () => {
    try {
      document.activeElement instanceof HTMLElement &&
        document.activeElement.blur();
    } catch {}
    setOpen(false);
  };
  const closeAuthDrawer = () => {
    try {
      document.activeElement instanceof HTMLElement &&
        document.activeElement.blur();
    } catch {}
    setAuthOpen(false);
  };

  // auth panel actions
  const goToLogin = () => {
    setAuthMode("login");
    setActiveSection("Logowanie");
    closeAuthDrawer();
  };
  const goToRegister = () => {
    setAuthMode("register");
    setActiveSection("Logowanie");
    closeAuthDrawer();
  };
  const deleteAccount = async () => {
    const token = localStorage.getItem("token");
    const answer = await Swal.fire({
      title: "Usuń konto?",
      text: "To działanie jest nieodwracalne.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
    });
    if (!answer.isConfirmed) return;
    if (token) {
      try {
        // próbuj wywołać endpoint usuwania konta (jeśli dodasz w backend)
        await fetch(
          (import.meta.env.VITE_API_URL || "http://localhost:4000") +
            "/api/user",
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } catch (err) {
        // ignore network errors — nadal czyścimy lokalne dane
      }
    }
    localStorage.clear();
    window.dispatchEvent(new CustomEvent("userLoggedOut"));
    closeAuthDrawer();
    window.location.reload();
  };
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // opcjonalnie: zachowaj lokal kopie? tutaj czyścimy aplikacyjne dane
    localStorage.removeItem("dishes");
    localStorage.removeItem("dishLists");
    localStorage.removeItem("lastMenu");
    localStorage.removeItem("savedMenus");
    localStorage.removeItem("settings");
    window.dispatchEvent(new CustomEvent("userLoggedOut"));
    // odśwież UI
    setTimeout(() => {
      closeAuthDrawer();
      setActiveSection("Jadłospis");
      window.location.reload();
    }, 100);
  };

  // Zaktualizuj useEffect dla userUpdated
  useEffect(() => {
    const onUserUpdated = (e) => {
      const user =
        e?.detail || JSON.parse(localStorage.getItem("user") || "null");
      if (!user) return;
      // Użyj buildAvatarUrl do prawidłowego przetworzenia ścieżki avatara
      const avatarPath = user.avatar || user?.settings?.avatar;
      setUserAvatarSrc(buildAvatarUrl(avatarPath));
    };
    window.addEventListener("userUpdated", onUserUpdated);
    return () => window.removeEventListener("userUpdated", onUserUpdated);
  }, []);

  // Globalne przetwarzanie ?token=... (OAuth redirect) — Navbar jest zawsze montowany
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("token");
        if (!t) return;
        // zapisz token
        localStorage.setItem("token", t);

        // pobierz podstawowy profil (avatar, username)
        try {
          const apiBase = (
            import.meta.env.VITE_API_URL || "http://localhost:4000"
          ).replace(/\/+$/, "");
          const me = await fetch(`${apiBase}/api/user/me`, {
            headers: { Authorization: `Bearer ${t}` },
          }).then((r) => (r.ok ? r.json() : null));
          const data = await fetch(`${apiBase}/api/user/data`, {
            headers: { Authorization: `Bearer ${t}` },
          }).then((r) => (r.ok ? r.json() : null));

          const user = (me && me.user) || {
            id: null,
            username: null,
            email: null,
            avatar: null,
          };
          const mergedUser = { ...user, data: data?.data || {} };
          localStorage.setItem("user", JSON.stringify(mergedUser));
          setUserAvatarSrc(buildAvatarUrl(user.avatar));

          // apply server data to localStorage keys like in Logowanie.applyUserData
          try {
            const server = mergedUser.data || {};
            if (Array.isArray(server.dishes)) {
              localStorage.setItem("dishes", JSON.stringify(server.dishes));
              window.dispatchEvent(
                new CustomEvent("dishesUpdated", { detail: server.dishes })
              );
            }
            if (Array.isArray(server.dishLists)) {
              localStorage.setItem(
                "dishLists",
                JSON.stringify(server.dishLists)
              );
              window.dispatchEvent(
                new CustomEvent("dishListsUpdated", {
                  detail: server.dishLists,
                })
              );
            }
            if (server.lastMenu !== undefined) {
              localStorage.setItem("lastMenu", JSON.stringify(server.lastMenu));
              window.dispatchEvent(
                new CustomEvent("lastMenuUpdated", { detail: server.lastMenu })
              );
            }
            if (Array.isArray(server.savedMenus)) {
              localStorage.setItem(
                "savedMenus",
                JSON.stringify(server.savedMenus)
              );
              window.dispatchEvent(
                new CustomEvent("savedMenusUpdated", {
                  detail: server.savedMenus,
                })
              );
            }
            if (server.settings) {
              localStorage.setItem("settings", JSON.stringify(server.settings));
              window.dispatchEvent(
                new CustomEvent("settingsUpdated", { detail: server.settings })
              );
            }
          } catch (e) {
            console.warn("apply server data failed", e);
          }

          // notify app
          window.dispatchEvent(
            new CustomEvent("userUpdated", { detail: mergedUser })
          );
          window.dispatchEvent(
            new CustomEvent("userLoggedIn", { detail: mergedUser })
          );

          // usuń token z URL
          params.delete("token");
          const newUrl =
            window.location.pathname +
            (params.toString() ? `?${params.toString()}` : "");
          window.history.replaceState({}, "", newUrl);
        } catch (e) {
          console.warn("OAuth postprocessing failed", e);
        }
      } catch (e) {}
    })();
  }, []);

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        id="navbar"
        sx={{
          height: {
            xs: 60, // 0 - 600
            sm: 70, // 600 - 900
            md: 75, // 900 - 1200
          },
          width: "100vw",
          backgroundColor: "#024059",
          boxShadow: "none",
        }}
      >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src={logoImg}
            alt="logo"
            sx={{ width: 80, height: 80, borderRadius: 2, marginRight: 1 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              Planer Jadłospisów
              {activeSection !== "Jadłospis" && (
                <Typography
                  component="span"
                  sx={{
                    //color: "rgba(255,255,255,0.7)", ten kolor jest zawsze jasny co jest słabow widoczne np na żułtym
                    ml: 1,
                    typography: "body1",
                  }}
                >
                  &gt; {activeSection}
                </Typography>
              )}
            </Typography>
          </Box>
          {/* przycisk otwierający prawy auth-panel */}
          <IconButton
            color="inherit"
            onClick={() => setAuthOpen(true)}
            aria-label="konto"
          >
            <AccountCircleIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* lewy główny drawer (sekcje) */}
      <Drawer anchor="left" open={open} onClose={closeLeftDrawer}>
        <Box sx={{ width: 260 }} role="presentation" onKeyDown={() => {}}>
          {menuGroups.map((group, gi) => (
            <Box key={gi}>
              <List>
                {group.items.map((it) => (
                  <ListItemButton
                    key={it}
                    selected={activeSection === it}
                    onClick={() => handleMenuClick(it)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {iconFor(it)}
                    </ListItemIcon>
                    <ListItemText primary={it} />
                  </ListItemButton>
                ))}
              </List>
              {gi < menuGroups.length - 1 && <Divider />}
            </Box>
          ))}
          ;
        </Box>
      </Drawer>

      {/* prawy auth-panel (kompaktowy) */}
      <Drawer anchor="right" open={authOpen} onClose={closeAuthDrawer}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography
            variant="h6"
            sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}
          >
            <AccountCircleIcon /> Konto
          </Typography>

          {/* pokaż nazwę użytkownika jeśli jest */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Avatar src={userAvatarSrc} sx={{ width: 32, height: 32 }}>
              {(
                JSON.parse(localStorage.getItem("user") || "null")?.username ||
                "U"
              )
                ?.charAt(0)
                ?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1">
                {JSON.parse(localStorage.getItem("user") || "null")?.username ||
                  "Gość"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {JSON.parse(localStorage.getItem("user") || "null")?.email ||
                  ""}
              </Typography>
            </Box>
          </Box>

          <List>
            {!isLogged && (
              <>
                <ListItemButton onClick={goToLogin}>
                  <ListItemIcon>
                    <LoginIcon />
                  </ListItemIcon>
                  <ListItemText primary="Zaloguj" />
                </ListItemButton>

                <ListItemButton onClick={goToRegister}>
                  <ListItemIcon>
                    <PersonAddIcon />
                  </ListItemIcon>
                  <ListItemText primary="Zarejestruj" />
                </ListItemButton>

                <ListItemButton
                  onClick={() => {
                    // start Google OAuth flow
                    window.location.href = `${API}/auth/google`;
                  }}
                >
                  <ListItemIcon>
                    <GoogleIcon />
                  </ListItemIcon>
                  <ListItemText primary="Zaloguj przez Google" />
                </ListItemButton>
              </>
            )}

            {isLogged && (
              <>
                {/* PRZYCISK: przejście do ustawień konta (oddzielne od ogólnych ustawień) */}
                <ListItemButton
                  onClick={() => {
                    setActiveSection("Ustawienia konta");
                    closeAuthDrawer();
                  }}
                >
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Ustawienia konta" />
                </ListItemButton>

                <Divider sx={{ my: 1 }} />

                <ListItemButton
                  onClick={() => {
                    handleLogout();
                    closeAuthDrawer();
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText primary="Wyloguj" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: 3 }}>
        {activeSection === "Jadłospis" && <Jadlospis />}
        {activeSection === "Publiczne jadłospisy" && (
          <PublicJadlospisy onLoad={(m) => setActiveSection("Jadłospis")} />
        )}
        {activeSection === "Jadłospisy" && <Jadlospisy />}
        {activeSection === "Potrawy" && <Potrawy />}
        {activeSection === "Dodaj potrawę" && <DodajPotrawe />}
        {activeSection === "Listy potraw" && <Listy />}
        {activeSection === "Lista zakupów" && <ListaZakupow />}
        {activeSection === "Ustawienia" && <Ustawienia />}
        {activeSection === "Ustawienia konta" && <UstawieniaKonta />}
        {activeSection === "Logowanie" && (
          <Logowanie
            mode={authMode}
            onLogged={() => setActiveSection("Jadłospis")}
          />
        )}
        {activeSection === "Publiczne potrawy" && <PublicPotrawy />}
      </Box>
    </>
  );
}
