// frontend/src/components/SkeletonCard.tsx
// FoodDiary — Skeleton screen for recipe cards
// Mimics the dimensions of RecipeCard using animate-pulse (Tailwind).
// Shown during page fetches instead of spinners.

export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      {/* Image placeholder */}
      <div className="w-full h-44 bg-gray-200" />

      <div className="p-4 space-y-3">
        {/* Category badge placeholder */}
        <div className="h-5 w-20 bg-gray-200 rounded-full" />

        {/* Title placeholder — two lines */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>

        {/* Author placeholder */}
        <div className="h-3 bg-gray-200 rounded w-1/2" />

        {/* Footer row placeholder */}
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-8 w-8 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}
