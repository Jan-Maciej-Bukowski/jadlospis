import React from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  TextField,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SaveIcon from "@mui/icons-material/Save";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import SettingsIcon from "@mui/icons-material/Settings";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Swal from "sweetalert2";
import { ThemeContext } from "../context/ThemeContext";
import Potrawy from "./potrawy";
import DodajPotrawe from "./dodajPotrawe";
import Jadlospis from "./jadlospis";
import Ustawienia from "./ustawienia";
import Listy from "./listy";
import Jadlospisy from "./jadlospisy";
import ListaZakupow from "./listaZakupow";

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("Jadłospis");
  const { changeTheme, updateCustomColor } = React.useContext(ThemeContext);
  const [customHex, setCustomHex] = React.useState("");

  const toggleDrawer = (state) => () => {
    setOpen(state);
  };

  const handleMenuClick = (section) => {
    setActiveSection(section);
    setOpen(false);
  };

  // podzielone sekcje menu — między grupami pojawi się pozioma linia (Divider)
  const menuGroups = [
    { items: ["Jadłospis", "Jadłospisy"] },
    { items: ["Potrawy", "Dodaj potrawę", "Listy potraw", "Lista zakupów"] }, // <- dodano Lista zakupów
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

  const handleCustomColorApply = () => {
    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
      updateCustomColor(customHex);
    } else {
      Swal.fire({
        icon: "warning",
        title: "Wprowadź poprawny kolor HEX",
        text: "Np. #ff6600",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer(true)}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Planer Jadłospisów
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={open} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          {/* menu podzielone na grupy z dividerami */}
          {menuGroups.map((group, gi) => (
            <Box key={gi}>
              <List>
                {group.items.map((text) => (
                  <ListItemButton
                    key={text}
                    onClick={() => handleMenuClick(text)}
                    selected={activeSection === text}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {iconFor(text)}
                    </ListItemIcon>
                    <ListItemText primary={text} />
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

          {/* Kolory tęczy */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, p: 2 }}>
            {[
              { name: "red", color: "#f44336" }, // Czerwony
              { name: "orange", color: "#ff9800" }, // Pomarańczowy
              { name: "yellow", color: "#ffeb3b" }, // Żółty
              { name: "green", color: "#4caf50" }, // Zielony
              { name: "blue", color: "#2196f3" }, // Niebieski
              { name: "indigo", color: "#3f51b5" }, // Indygo
              { name: "purple", color: "#9c27b0" }, // Fioletowy
              { name: "dark", color: "#212121" }, // Ciemny motyw
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
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              sx={{ mb: 2 }}
              onClick={(e) => e.stopPropagation()} // Zatrzymanie propagacji kliknięcia
              onKeyDown={(e) => e.stopPropagation()} // Zatrzymanie propagacji klawiatury
            />
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={(e) => {
                e.stopPropagation(); // Zatrzymanie propagacji kliknięcia
                handleCustomColorApply();
              }}
            >
              Zastosuj
            </Button>
          </Box>

          {/* Przycisk do wyczyszczenia danych */}
          <ListItem>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => {
                Swal.fire({
                  title: "Jesteś pewien?",
                  text: "Usuniętych danych nie da się przywrócić!",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonColor: "#3085d6",
                  cancelButtonColor: "#d33",
                  confirmButtonText: "Usuń",
                  cancelButtonText: "Anuluj", // 👈 tu zmieniasz napis
                }).then((result) => {
                  if (result.isConfirmed) {
                    localStorage.clear();
                    window.location.reload();
                  }
                });
              }}
              sx={{ mt: 2 }}
            >
              Wyczyść dane
            </Button>
          </ListItem>
        </Box>
      </Drawer>

      <Box sx={{ p: 3 }}>
        {activeSection === "Jadłospis" && <Jadlospis />}
        {activeSection === "Jadłospisy" && <Jadlospisy />}
        {activeSection === "Lista zakupów" && <ListaZakupow />}
        {activeSection === "Potrawy" && <Potrawy />}
        {activeSection === "Dodaj potrawę" && <DodajPotrawe />}
        {activeSection === "Listy potraw" && <Listy />}
        {activeSection === "Ustawienia" && <Ustawienia />}
      </Box>
    </>
  );
}
