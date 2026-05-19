// frontend/src/components/PaginationControls.tsx
// FoodDiary — Pagination controls
// Previous button is visually disabled on page 1 per spec.

import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

interface PaginationControlsProps {
  page: number;
  onPrev: () => void;
  onNext: () => void;
  hasMore: boolean;
}

export default function PaginationControls({
  page,
  onPrev,
  onNext,
  hasMore,
}: PaginationControlsProps) {
  const { t } = useTranslation();
  const isFirst = page === 1;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={onPrev}
        disabled={isFirst}
        className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors
          ${isFirst
            ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
      >
        <FiChevronLeft size={16} />
        {t("pagination.previous")}
      </button>

      <span className="text-sm text-gray-500">
        {t("pagination.page")} {page}
      </span>

      <button
        onClick={onNext}
        disabled={!hasMore}
        className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors
          ${!hasMore
            ? "opacity-30 cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
      >
        {t("pagination.next")}
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
