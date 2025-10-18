import React, { createContext, useState, useEffect, useMemo } from "react";
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { THEME_COLORS } from "../utils/colors";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // load initial settings from unified settings key first (login writes settings there)
  const loadInitial = () => {
    try {
      const s = JSON.parse(localStorage.getItem("settings") || "{}");
      return {
        themeName: s.themeName || localStorage.getItem("themeName") || "blue",
        customColor:
          s.customColor || localStorage.getItem("customColor") || "#1976d2",
      };
    } catch {
      return {
        themeName: localStorage.getItem("themeName") || "blue",
        customColor: localStorage.getItem("customColor") || "#1976d2",
      };
    }
  };

  const initial = loadInitial();
  const [themeName, setThemeName] = useState(() => initial.themeName);
  const [customColor, setCustomColor] = useState(() => initial.customColor);

  // persist into unified settings object and emit event
  const persistToSettings = (partial) => {
    try {
      const cur = JSON.parse(localStorage.getItem("settings") || "{}");
      const next = { ...cur, ...partial };
      localStorage.setItem("settings", JSON.stringify(next));
      // notify sync module
      try {
        window.dispatchEvent(
          new CustomEvent("settingsUpdated", { detail: next })
        );
      } catch {}
    } catch (e) {
      // fallback single keys
      try {
        localStorage.setItem("settings", JSON.stringify(partial));
      } catch {}
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem("themeName", themeName);
      // also persist into settings so server sync saves it
      persistToSettings({ themeName });
    } catch {}
  }, [themeName]);

  useEffect(() => {
    try {
      localStorage.setItem("customColor", customColor);
      persistToSettings({ customColor });
    } catch {}
  }, [customColor]);

  // --- ADDED: functions used in provider value ---
  const changeTheme = (name) => {
    setThemeName(name);
  };

  const updateCustomColor = (hex) => {
    if (!hex) return;
    setCustomColor(hex);
    // optionally switch to custom theme when user sets a hex
    setThemeName("custom");
  };
  // --- end added ---

  // react to external settings changes (login / other tabs / manual updates)
  useEffect(() => {
    const onSettingsUpdated = (e) => {
      try {
        const s =
          e?.detail || JSON.parse(localStorage.getItem("settings") || "{}");
        if (s.themeName && s.themeName !== themeName) setThemeName(s.themeName);
        if (s.customColor && s.customColor !== customColor)
          setCustomColor(s.customColor);
      } catch {}
    };
    const onStorage = (e) => {
      if (
        e.key === "settings" ||
        e.key === "themeName" ||
        e.key === "customColor"
      ) {
        try {
          const s = JSON.parse(localStorage.getItem("settings") || "{}");
          if (s.themeName && s.themeName !== themeName)
            setThemeName(s.themeName);
          if (s.customColor && s.customColor !== customColor)
            setCustomColor(s.customColor);
        } catch {
          // fallback to individual keys
          const tn = localStorage.getItem("themeName");
          const cc = localStorage.getItem("customColor");
          if (tn && tn !== themeName) setThemeName(tn);
          if (cc && cc !== customColor) setCustomColor(cc);
        }
      }
    };
    const onUserLoggedIn = () => {
      // after login other code writes localStorage.settings; reload it
      try {
        const s = JSON.parse(localStorage.getItem("settings") || "{}");
        if (s.themeName) setThemeName(s.themeName);
        if (s.customColor) setCustomColor(s.customColor);
        // also notify userSync if needed (some code dispatches userSync:setLastHash)
      } catch {}
    };

    window.addEventListener("settingsUpdated", onSettingsUpdated);
    window.addEventListener("storage", onStorage);
    window.addEventListener("userLoggedIn", onUserLoggedIn);

    return () => {
      window.removeEventListener("settingsUpdated", onSettingsUpdated);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userLoggedIn", onUserLoggedIn);
    };
  }, [themeName, customColor]);

  // compute MUI theme based on selected themeName + customColor
  const muiTheme = useMemo(() => {
    const isDark = themeName === "dark";
    const primaryMain =
      themeName === "custom"
        ? customColor
        : THEME_COLORS[themeName] || customColor;

    const theme = createTheme({
      palette: {
        mode: isDark ? "dark" : "light",
        primary: { main: primaryMain },
      },
      components: {
        MuiAppBar: {
          styleOverrides: {
            colorPrimary: {
              backgroundColor: primaryMain,
            },
          },
        },
      },
    });

    // also set CSS variable for non-MUI usage
    try {
      document.documentElement.style.setProperty("--app-primary", primaryMain);
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light"
      );
    } catch {}

    return theme;
  }, [themeName, customColor]);

  return (
    <ThemeContext.Provider
      value={{ themeName, customColor, changeTheme, updateCustomColor }}
    >
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
