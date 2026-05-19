// frontend/src/components/RecipeCard.tsx
// FoodDiary — Recipe card component
// Features:
//   - Framer Motion fade-up animation on mount
//   - Optimistic update when adding to To-Do list (instant UI response)
//   - Discarded state visual (gray tint overlay)
//   - Auth guard on the + icon

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FiBookmark, FiCheck } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import type { Recipe } from "@/types";

interface RecipeCardProps {
  recipe: Recipe;
  /** If true, the card was previously discarded (gray tint + confirm dialog) */
  isDiscarded?: boolean;
  /** Timestamp label shown below the title (planned, discarded, cooked) */
  dateLabel?: string;
  /** Show the checkmark button (only in To-Do list view) */
  showCompleteButton?: boolean;
  /** Called by parent after user completes a recipe in To-Do list */
  onComplete?: (interactionId: string) => void;
  interactionId?: string;
}

export default function RecipeCard({
  recipe,
  isDiscarded = false,
  dateLabel,
  showCompleteButton = false,
  onComplete,
  interactionId,
}: RecipeCardProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  // Optimistic update state — true = already added, animates the icon
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDiscardedConfirm, setShowDiscardedConfirm] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  async function handleAddToTodo() {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (isDiscarded) {
      setShowDiscardedConfirm(true);
      return;
    }
    await doAddToTodo();
  }

  async function doAddToTodo() {
    // Optimistic update — immediate UI response before server confirms
    setAdded(true);
    setLoading(true);
    setShowDiscardedConfirm(false);

    try {
      await api.post("/interactions", {
        local_recipe_id: recipe.source === "local" ? recipe.id : undefined,
        api_recipe_id: recipe.source === "api" ? recipe.id : undefined,
        title: recipe.source === "api" ? recipe.title : undefined,
        image_url: recipe.source === "api" ? recipe.image_url : undefined,
      });
    } catch {
      // Revert optimistic update on failure
      setAdded(false);
      setErrorToast(t("errors.network"));
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Framer Motion fade-up on mount */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100
          hover:shadow-md transition-shadow ${isDiscarded ? "opacity-60 grayscale-[40%]" : ""}`}
      >
        {/* Recipe image */}
        <Link to={`/recipe/${recipe.source}/${recipe.id}`}>
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-44 object-cover"
            />
          ) : (
            <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">
              🍽️
            </div>
          )}
        </Link>

        <div className="p-4">
          {/* Category badge */}
          <span className="inline-block bg-brand-50 text-brand-700 text-xs font-medium px-2.5 py-0.5 rounded-full mb-2">
            {t(`categories.${recipe.category}`, { defaultValue: recipe.category })}
          </span>

          {/* Title */}
          <Link to={`/recipe/${recipe.source}/${recipe.id}`}>
            <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-brand-600 transition-colors">
              {recipe.title}
            </h3>
          </Link>

          {/* Author label */}
          <p className="text-xs text-gray-400 mt-1">{recipe.authorLabel}</p>

          {/* Date label (planned / discarded / cooked) */}
          {dateLabel && (
            <p className="text-xs text-gray-400 mt-0.5">{dateLabel}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            {/* Servings info */}
            <span className="text-xs text-gray-400">
              {recipe.base_servings
                ? `${recipe.base_servings} ${t("detail.servings").toLowerCase()}`
                : "—"}
            </span>

            <div className="flex items-center gap-2">
              {/* Complete button (To-Do list only) */}
              {showCompleteButton && interactionId && (
                <button
                  onClick={() => onComplete?.(interactionId)}
                  className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                  title={t("detail.didYouCook")}
                >
                  <FiCheck size={16} />
                </button>
              )}

              {/* Add to To-Do button — optimistic icon state */}
              {!showCompleteButton && (
                <button
                  onClick={handleAddToTodo}
                  disabled={loading || added}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                    ${added
                      ? "bg-brand-600 text-white"
                      : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                    }`}
                  title={t("home.addToTodo")}
                >
                  <FiBookmark size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Discarded overlay tint */}
        {isDiscarded && (
          <div className="absolute inset-0 bg-gray-100 opacity-20 pointer-events-none rounded-2xl" />
        )}
      </motion.div>

      {/* Discarded confirmation dialog */}
      {showDiscardedConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-gray-800 text-sm mb-4">{t("home.discardedWarning")}</p>
            <div className="flex gap-3">
              <button
                onClick={doAddToTodo}
                className="flex-1 bg-brand-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-brand-700"
              >
                {t("home.tryAgain")}
              </button>
              <button
                onClick={() => setShowDiscardedConfirm(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                {t("home.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errorToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">
          {errorToast}
        </div>
      )}
    </>
  );
}
