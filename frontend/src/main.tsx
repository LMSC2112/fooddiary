// frontend/src/main.tsx
// FoodDiary — App entry point
// Handles session persistence (localStorage vs sessionStorage per spec)
// and bootstraps i18n before rendering.

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./i18n";
import "./index.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
