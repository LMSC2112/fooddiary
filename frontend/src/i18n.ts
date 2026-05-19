// frontend/src/i18n.ts
// FoodDiary — Internationalization setup (react-i18next)
// Reads language preference from localStorage, falls back to browser language.

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./assets/locales/en.json";
import es from "./assets/locales/es.json";

const savedLanguage = localStorage.getItem("fooddiary_lang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    // React already escapes values — no need for i18next to do it again
    escapeValue: false,
  },
});

export default i18n;
