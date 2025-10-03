import React, { createContext, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

export const ThemeContext = createContext();

const themes = {
  // Kolory tęczy
  red: { palette: { primary: { main: "#f44336" }, mode: "light" } }, // Czerwony
  orange: { palette: { primary: { main: "#ff9800" }, mode: "light" } }, // Pomarańczowy
  yellow: { palette: { primary: { main: "#ffeb3b" }, mode: "light" } }, // Żółty
  green: { palette: { primary: { main: "#4caf50" }, mode: "light" } }, // Zielony
  blue: { palette: { primary: { main: "#2196f3" }, mode: "light" } }, // Niebieski
  indigo: { palette: { primary: { main: "#3f51b5" }, mode: "light" } }, // Indygo
  purple: { palette: { primary: { main: "#9c27b0" }, mode: "light" } }, // Fioletowy

  // Ciemny motyw
  dark: { palette: { mode: "dark" } }, // Ciemny motyw
};

export const ThemeContextProvider = ({ children }) => {
  const [themeName, setThemeName] = useState(
    localStorage.getItem("theme") || "default"
  );
  const [customColor, setCustomColor] = useState(
    localStorage.getItem("customColor") || "#1976d2"
  );

  const theme = createTheme(
    themeName === "custom"
      ? { palette: { primary: { main: customColor }, mode: "light" } }
      : themes[themeName]
  );

  const changeTheme = (name) => {
    setThemeName(name);
    localStorage.setItem("theme", name);
  };

  const updateCustomColor = (color) => {
    setCustomColor(color);
    localStorage.setItem("customColor", color);
    changeTheme("custom");
  };

  return (
    <ThemeContext.Provider
      value={{ themeName, changeTheme, updateCustomColor }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
