// frontend/src/components/CookModal.tsx
// FoodDiary — "Did you cook this today?" decision modal
// Framer Motion spring physics — slides up from bottom like a native mobile sheet.

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface CookModalProps {
  isOpen: boolean;
  onSaveToCookbook: () => void;
  onJustRemove: () => void;
  onClose: () => void;
}

export default function CookModal({
  isOpen,
  onSaveToCookbook,
  onJustRemove,
  onClose,
}: CookModalProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />

          {/* Modal sheet — spring physics from bottom (mobile-native feel) */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 shadow-2xl
              md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:max-w-md md:rounded-2xl"
          >
            {/* Handle bar (mobile) */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6 md:hidden" />

            <h2 className="text-lg font-semibold text-gray-900 text-center mb-1">
              {t("modal.title")}
            </h2>
            <p className="text-sm text-gray-500 text-center mb-6">{t("modal.subtitle")}</p>

            <div className="flex flex-col gap-3">
              <button
                onClick={onSaveToCookbook}
                className="w-full bg-brand-600 text-white py-3 rounded-xl font-medium
                  hover:bg-brand-700 transition-colors"
              >
                {t("modal.saveToCookbook")}
              </button>
              <button
                onClick={onJustRemove}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium
                  hover:bg-gray-200 transition-colors"
              >
                {t("modal.justRemove")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
