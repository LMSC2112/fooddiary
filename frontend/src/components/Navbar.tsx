// frontend/src/components/Navbar.tsx
// FoodDiary — Global navigation bar
// Features: Lobster brand font, EN|ES opacity toggle, auth-aware menu.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiLogOut, FiList, FiBook } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function switchLanguage(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem("fooddiary_lang", lang);
  }

  function handleLogout() {
    logout();
    navigate("/");
    setMenuOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="font-lobster text-2xl text-brand-600 tracking-wide"
        >
          FoodDiary
        </Link>

        {/* Center/Right controls */}
        <div className="flex items-center gap-4">
          {/* Language toggle — opacity signals active state per spec */}
          <div className="flex items-center gap-1 text-sm font-medium">
            <button
              onClick={() => switchLanguage("en")}
              className="transition-opacity"
              style={{ opacity: i18n.language === "en" ? 1 : 0.4 }}
            >
              EN
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={() => switchLanguage("es")}
              className="transition-opacity"
              style={{ opacity: i18n.language === "es" ? 1 : 0.4 }}
            >
              ES
            </button>
          </div>

          {/* Anonymous state */}
          {!isAuthenticated && (
            <div className="flex items-center gap-3 text-sm">
              <Link
                to="/login"
                className="text-gray-600 hover:text-brand-600 transition-colors"
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/register"
                className="bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
              >
                {t("nav.register")}
              </Link>
            </div>
          )}

          {/* Authenticated state — avatar + dropdown */}
          {isAuthenticated && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm hover:bg-brand-200 transition-colors"
              >
                {user?.name?.charAt(0).toUpperCase()}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm">
                  <div className="px-4 py-2 text-gray-500 border-b border-gray-100">
                    {user?.name}
                  </div>
                  <Link
                    to="/my-todo"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    <FiList size={15} />
                    {t("nav.myTodo")}
                  </Link>
                  <Link
                    to="/my-cookbook"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                  >
                    <FiBook size={15} />
                    {t("nav.myCookbook")}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-red-500"
                  >
                    <FiLogOut size={15} />
                    {t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
