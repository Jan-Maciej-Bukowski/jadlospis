import React, { useState, useContext } from "react";
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

import Jadlospis from "./jadlospis";
import Jadlospisy from "./jadlospisy";
import Potrawy from "./potrawy";
import DodajPotrawe from "./dodajPotrawe";
import Listy from "./listy";
import ListaZakupow from "./listaZakupow";
import Ustawienia from "./ustawienia";
import Logowanie from "./logowanie";
import Swal from "sweetalert2";
import { ThemeContext } from "../context/ThemeContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Jadłospis");

  // theme context
  const { changeTheme, updateCustomColor } = useContext(ThemeContext);

  // lokalny stan pola na HEX (używany w TextField)
  const [customHexInput, setCustomHexInput] = useState(
    localStorage.getItem("customColor") || "#1976d2"
  );

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
    // ustaw customColor i przełącz motyw na "custom"
    updateCustomColor(v);
    changeTheme("custom");
    // zapisz też w settings (ThemeContext robi to przez useEffect)
    Swal.fire({
      icon: "success",
      title: "Zastosowano",
      text: `Kolor ${v} ustawiony`,
    });
  };

  const menuGroups = [
    { items: ["Jadłospis", "Jadłospisy"] },
    { items: ["Potrawy", "Dodaj potrawę", "Listy potraw", "Lista zakupów"] },
    { items: ["Ustawienia"] },
  ];

  const iconFor = (text) => {
    switch (text) {
      case "Jadłospis":
        return <CalendarTodayIcon />;
      case "Jadłospisy":
        return <SaveIcon />;
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

  // fallbackowa paleta kolorów używana przy renderowaniu przycisków/pepytków
  const customHex = [
    "#F44336",
    "#E91E63",
    "#9C27B0",
    "#673AB7",
    "#3F51B5",
    "#2196F3",
    "#03A9F4",
    "#00BCD4",
    "#009688",
    "#4CAF50",
    "#8BC34A",
    "#CDDC39",
    "#FFEB3B",
    "#FFC107",
    "#FF9800",
    "#FF5722",
    "#795548",
    "#9E9E9E",
    "#607D8B",
  ];

  // auth panel actions
  const goToLogin = () => {
    setActiveSection("Logowanie");
    closeAuthDrawer();
  };
  const goToRegister = () => {
    // simple flag so Logowanie can open in register mode if implemented
    try {
      localStorage.setItem("authMode", "register");
    } catch {}
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
  const clearData = () => {
    Swal.fire({
      title: "Jesteś pewien?",
      text: "Usuniętych danych nie da się przywrócić!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Usuń",
      cancelButtonText: "Anuluj",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        window.location.reload();
      }
    });
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

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Planer Jadłospisów
          </Typography>

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

          {/* Sekcja zmiany motywu */}
          <List>
            <ListItem>
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Zmień motyw
              </Typography>
            </ListItem>
          </List>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 2 }}>
            {[
              { name: "red", color: "#f44336" },
              { name: "orange", color: "#ff9800" },
              { name: "yellow", color: "#ffeb3b" },
              { name: "green", color: "#4caf50" },
              { name: "blue", color: "#2196f3" },
              { name: "indigo", color: "#3f51b5" },
              { name: "purple", color: "#9c27b0" },
              { name: "dark", color: "#212121" },
            ].map((theme) => (
              <Box
                key={theme.name}
                onClick={() => changeTheme(theme.name)}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  backgroundColor: theme.color,
                  cursor: "pointer",
                  border: "2px solid #fff",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                }}
              />
            ))}
          </Box>

          {/* Pole do wpisania własnego koloru */}
          <Box sx={{ p: 2 }}>
            <TextField
              label="Własny kolor HEX"
              variant="outlined"
              fullWidth
              value={customHexInput}
              onChange={(e) => setCustomHexInput(e.target.value)}
              sx={{ mb: 2 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                handleCustomColorApply();
              }}
            >
              Zastosuj
            </Button>
          </Box>
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
            <Avatar>
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

            <ListItemButton onClick={deleteAccount}>
              <ListItemIcon>
                <DeleteForeverIcon color="error" />
              </ListItemIcon>
              <ListItemText primary="Usuń konto" />
            </ListItemButton>

            <ListItemButton
              onClick={() => {
                clearData();
              }}
            >
              <ListItemIcon>
                <DeleteSweepIcon />
              </ListItemIcon>
              <ListItemText primary="Wyczyść dane" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: 3 }}>
        {activeSection === "Jadłospis" && <Jadlospis />}
        {activeSection === "Jadłospisy" && <Jadlospisy />}
        {activeSection === "Potrawy" && <Potrawy />}
        {activeSection === "Dodaj potrawę" && <DodajPotrawe />}
        {activeSection === "Listy potraw" && <Listy />}
        {activeSection === "Lista zakupów" && <ListaZakupow />}
        {activeSection === "Ustawienia" && <Ustawienia />}
        {activeSection === "Logowanie" && (
          <Logowanie onLogged={() => setActiveSection("Jadłospis")} />
        )}
      </Box>
    </>
  );
}
