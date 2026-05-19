// frontend/src/pages/Home.tsx
// FoodDiary — Public recipe library (main landing page)
// Features: category carousel, filter dropdown, CSS Grid (1/2/3 col),
//           skeleton screens during fetch, pagination.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import RecipeCard from "../components/RecipeCard";
import SkeletonCard from "../components/SkeletonCard";
import CategoryCarousel from "../components/CategoryCarousel";
import PaginationControls from "../components/PaginationControls";
import type { Recipe, FilterType, PaginationMeta } from "@/types";

export default function Home() {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 30, totalLocal: 0, totalApi: 0,});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchRecipes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedCategory, filter]);

  async function fetchRecipes() {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (selectedCategory) params.category = selectedCategory;
      if (filter !== "all") params.filter = filter;

      const { data } = await api.get("/recipes", { params });
      setRecipes(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit: 30, totalLocal: 0, totalApi: 0 });
    } catch {
      setRecipes([]);
      setPagination({ page: 1, limit: 30, totalLocal: 0, totalApi: 0 });
    } finally {
      setLoading(false);
    }
  }

  function handleCategorySelect(cat: string | null) {
    setSelectedCategory(cat);
    setPage(1);
  }

    const hasMore =
      (pagination.totalLocal ?? 0) + (pagination.totalApi ?? 0) > page * pagination.limit;

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("home.title")}</h1>

      {/* Filter dropdown */}
      <div className="flex items-center gap-3">
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as FilterType);
            setPage(1);
          }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700
            focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">{t("home.filterAll")}</option>
          <option value="new">{t("home.filterNew")}</option>
          <option value="discarded">{t("home.filterDiscarded")}</option>
        </select>
      </div>

      {/* Category carousel */}
      <CategoryCarousel
        selected={selectedCategory}
        onSelect={handleCategorySelect}
      />

      {/* Recipe grid — 1 col mobile, 2 tablet, 3 desktop */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (recipes ?? []).length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-5xl mb-4">🍽️</span>
          <p className="text-gray-500">{t("home.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recipes.map((recipe) => (
            <RecipeCard key={`${recipe.source}-${recipe.id}`} recipe={recipe} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && recipes.length > 0 && (
        <PaginationControls
          page={page}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
          hasMore={hasMore}
        />
      )}
    </main>
  );
}
