// frontend/src/pages/MyTodoList.tsx
// FoodDiary — User's To-Do List (protected route)
// Features: Framer Motion fade-up exit when card is completed,
//           CookModal spring sheet, empty state.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import api from "../lib/api";
import CookModal from "../components/CookModal";
import SkeletonCard from "../components/SkeletonCard";
import RecipeCard from "../components/RecipeCard";
import type { Interaction } from "@/types";

export default function MyTodoList() {
  const { t } = useTranslation();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchTodo();
  }, []);

  async function fetchTodo() {
    setLoading(true);
    try {
      const { data } = await api.get("/interactions/todo");
      setInteractions(data.data);
    } finally {
      setLoading(false);
    }
  }

  function handleCompleteClick(interactionId: string) {
    setActiveInteractionId(interactionId);
    setModalOpen(true);
  }

  async function handleModalAction(action: "save_to_cookbook" | "just_remove") {
    if (!activeInteractionId) return;

    // Optimistic update — remove card immediately with animation
    setInteractions((prev) =>
      prev.filter((i) => i.interaction_id !== activeInteractionId)
    );
    setModalOpen(false);

    try {
      await api.patch(`/interactions/${activeInteractionId}/complete`, { action });
    } catch {
      // Revert on failure
      fetchTodo();
    }
    setActiveInteractionId(null);
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("todo.title")}</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : interactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-gray-500">{t("todo.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {interactions.map((interaction) => {
              const recipe = {
                id: interaction.local_recipe_id || interaction.api_recipe_id || "",
                source: (interaction.local_recipe_id ? "local" : "api") as "local" | "api",
                title: interaction.title || interaction.api_recipe_title || "Recipe",
                category: interaction.category || "Miscellaneous",
                image_url: interaction.image_url || interaction.api_recipe_image || null,
                base_servings: interaction.base_servings || null,
                serving_size: interaction.serving_size || null,
                author: interaction.author || "",
                authorLabel: `By: ${interaction.author || ""}`,
              };

              const dateLabel = interaction.created_at
                ? `${t("home.planned")} ${new Date(interaction.created_at).toLocaleDateString()}`
                : undefined;

              return (
                <motion.div
                  key={interaction.interaction_id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <RecipeCard
                    recipe={recipe}
                    dateLabel={dateLabel}
                    showCompleteButton
                    interactionId={interaction.interaction_id}
                    onComplete={handleCompleteClick}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <CookModal
        isOpen={modalOpen}
        onSaveToCookbook={() => handleModalAction("save_to_cookbook")}
        onJustRemove={() => handleModalAction("just_remove")}
        onClose={() => {
          setModalOpen(false);
          setActiveInteractionId(null);
        }}
      />
    </main>
  );
}
