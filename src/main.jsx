import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

import { initUserSync } from "./utils/userSync";
import { ThemeProvider } from "./context/ThemeContext";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// start auto-sync (debounced) — wywołanie jednorazowe przy starcie aplikacji
initUserSync();
