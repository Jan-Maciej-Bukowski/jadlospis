import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import './styles/base.scss';

import { initUserSync } from "./utils/userSync";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// start auto-sync (debounced) — wywołanie jednorazowe przy starcie aplikacji
initUserSync();
