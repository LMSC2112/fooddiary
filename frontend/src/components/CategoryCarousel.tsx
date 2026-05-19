// frontend/src/components/CategoryCarousel.tsx
// FoodDiary — Horizontal swipable category carousel
// Uses native overflow-x: auto (scrollbar-hide utility) — no library needed.
// Categories come from TheMealDB API labels stored as-is in the DB.

import { useTranslation } from "react-i18next";

const CATEGORIES = [
  "Beef",
  "Breakfast",
  "Chicken",
  "Dessert",
  "Lamb",
  "Miscellaneous",
  "Pasta",
  "Pork",
  "Seafood",
  "Vegan",
  "Vegetarian",
];

const CATEGORY_EMOJI: Record<string, string> = {
  Beef: "🥩",
  Breakfast: "🍳",
  Chicken: "🍗",
  Dessert: "🍰",
  Lamb: "🫕",
  Miscellaneous: "🍽️",
  Pasta: "🍝",
  Pork: "🥓",
  Seafood: "🦞",
  Vegan: "🥗",
  Vegetarian: "🥦",
};

interface CategoryCarouselProps {
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export default function CategoryCarousel({ selected, onSelect }: CategoryCarouselProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-4 -mx-4">
      {/* "All" pill */}
      <button
        onClick={() => onSelect(null)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
          ${
            selected === null
              ? "bg-brand-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
      >
        {t("home.filterAll")}
      </button>

      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat === selected ? null : cat)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${
              selected === cat
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          <span>{CATEGORY_EMOJI[cat]}</span>
          {t(`categories.${cat}`)}
        </button>
      ))}
    </div>
  );
}
