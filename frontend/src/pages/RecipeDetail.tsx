// frontend/src/pages/RecipeDetail.tsx
// FoodDiary — Full recipe detail view
// Features: accordion calculator, unit/servings toggle, fallback banner,
//           "Did you cook this today?" button + CookModal.

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useRecipeCalculator } from "../hooks/useRecipeCalculator";
import CookModal from "../components/CookModal";
import type { Recipe, RecipeIngredientRaw } from "@/types";

export default function RecipeDetail() {
  const { source, id } = useParams<{ source: string; id: string }>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, source]);

  async function fetchRecipe() {
    setLoading(true);
    try {
      const { data } = await api.get(`/recipes/${id}`);
      setRecipe(data);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  // Normalize ingredients for the calculator hook
  const ingredients: RecipeIngredientRaw[] = recipe?.ingredients || [];
  const calcIngredients = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name,
    baseQuantity: ing.base_quantity ?? 1,
    baseUnit: ing.base_unit,
  }));

  const {
    desiredServings,
    unitSystem,
    scaledIngredients,
    isFallbackMode,
    fallbackMessage,
    setDesiredServings,
    setUnitSystem,
  } = useRecipeCalculator(calcIngredients, recipe?.base_servings ?? null);

  async function handleDidYouCook() {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    // Fetch the user's interaction row for this recipe to get the interactionId
    try {
      const { data } = await api.get("/interactions/todo");
      const match = data.data.find(
        (i: { local_recipe_id?: string; api_recipe_id?: string; interaction_id: string }) =>
          i.local_recipe_id === id || i.api_recipe_id === id
      );
      if (match) {
        setInteractionId(match.interaction_id);
        setModalOpen(true);
      }
    } catch {
      setModalOpen(true);
    }
  }

  async function handleModalAction(action: "save_to_cookbook" | "just_remove") {
    if (!interactionId) return;
    try {
      await api.patch(`/interactions/${interactionId}/complete`, { action });
      setModalOpen(false);
      navigate("/my-todo");
    } catch {
      setModalOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-8 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  if (!recipe) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header image */}
      {recipe.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.title}
          className="w-full h-64 object-cover rounded-2xl"
        />
      )}

      {/* Title + meta */}
      <div>
        <span className="text-xs font-medium text-brand-600 uppercase tracking-wide">
          {t(`categories.${recipe.category}`, { defaultValue: recipe.category })}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{recipe.title}</h1>
        <p className="text-sm text-gray-400 mt-1">{recipe.authorLabel}</p>
      </div>

      {/* Did you cook this today? */}
      <button
        onClick={handleDidYouCook}
        className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium
          hover:bg-brand-700 transition-colors"
      >
        {t("detail.didYouCook")}
      </button>

      {/* Fallback banner for API recipes */}
      {isFallbackMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          {fallbackMessage}
        </div>
      )}

      {/* Accordion calculator */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setCalculatorOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium
            text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span>🧮 {t("detail.calculator")}</span>
          {calculatorOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>

        {calculatorOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
            {/* Servings input */}
            <div className="flex items-center gap-4 pt-4">
              <label className="text-sm text-gray-600 w-28">{t("detail.servings")}</label>
              <input
                type="number"
                min={1}
                max={100}
                value={desiredServings}
                onChange={(e) => setDesiredServings(Number(e.target.value))}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Unit system toggle */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-28">{t("detail.units")}</span>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm">
                <button
                  onClick={() => setUnitSystem("metric")}
                  className={`px-4 py-2 transition-colors ${
                    unitSystem === "metric"
                      ? "bg-brand-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t("detail.metric")}
                </button>
                <button
                  onClick={() => setUnitSystem("american")}
                  className={`px-4 py-2 transition-colors ${
                    unitSystem === "american"
                      ? "bg-brand-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t("detail.american")}
                </button>
              </div>
            </div>

            {/* Scaled ingredients list */}
            <ul className="space-y-2 pt-2">
              {scaledIngredients.map((ing) => (
                <li
                  key={ing.id}
                  className="flex items-center justify-between text-sm text-gray-700"
                >
                  <span>{ing.name}</span>
                  <span className="font-medium text-brand-600">
                    {ing.displayQuantity} {ing.displayUnit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions */}
      {recipe.instructions && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t("detail.instructions")}
          </h2>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {recipe.instructions}
          </div>
        </div>
      )}

      <CookModal
        isOpen={modalOpen}
        onSaveToCookbook={() => handleModalAction("save_to_cookbook")}
        onJustRemove={() => handleModalAction("just_remove")}
        onClose={() => setModalOpen(false)}
      />
    </main>
  );
}
