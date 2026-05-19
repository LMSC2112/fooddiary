// frontend/src/pages/MyCookbook.tsx
// FoodDiary — Virtual Cookbook (protected route)
// Shows all recipes the user has saved after cooking them.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import RecipeCard from "../components/RecipeCard";
import SkeletonCard from "../components/SkeletonCard";
import type { Interaction } from "../types";

export default function MyCookbook() {
  const { t } = useTranslation();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCookbook();
  }, []);

  async function fetchCookbook() {
    setLoading(true);
    try {
      const { data } = await api.get("/interactions/cookbook");
      setInteractions(data.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("cookbook.title")}</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : interactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📖</span>
          <p className="text-gray-500">{t("cookbook.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {interactions.map((interaction) => {
            const recipe = {
              id: interaction.local_recipe_id || interaction.api_recipe_id || "",
              source: (interaction.local_recipe_id ? "local" : "api") as "local" | "api",
              title: interaction.title || "Recipe",
              category: interaction.category || "Miscellaneous",
              image_url: interaction.image_url || null,
              base_servings: interaction.base_servings || null,
              serving_size: interaction.serving_size || null,
              author: interaction.author || "",
              authorLabel: `By: ${interaction.author || ""}`,
            };

            const dateLabel = interaction.fecha_estado_receta
              ? `${t("cookbook.cookedOn")} ${new Date(
                  interaction.fecha_estado_receta
                ).toLocaleDateString()}`
              : undefined;

            return (
              <RecipeCard key={interaction.interaction_id} recipe={recipe} dateLabel={dateLabel} />
            );
          })}
        </div>
      )}
    </main>
  );
}
