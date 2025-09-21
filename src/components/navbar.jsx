import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Potrawy from "./potrawy";
import DodajPotrawe from './dodajPotrawe';
import Jadlospis from "./jadlospis";
import Ustawienia from "./ustawienia";

export default function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("Jadłospis");

  const toggleDrawer = (state) => () => {
    setOpen(state);
  };

  const menuItems = ["Jadłospis", "Potrawy", "Dodaj potrawę", "Ustawienia"];

  const handleMenuClick = (section) => {
    setActiveSection(section);
    setOpen(false);
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

          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={open} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            {menuItems.map((text) => (
              <ListItem button key={text} onClick={() => handleMenuClick(text)}>
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: 3 }}>
        {activeSection === "Jadłospis" && <Jadlospis />}
        {activeSection === "Potrawy" && <Potrawy />}
        {activeSection === "Dodaj potrawę" && <DodajPotrawe />}
        {activeSection === "Ustawienia" && <Ustawienia />}
      </Box>
    </>
  );
}
