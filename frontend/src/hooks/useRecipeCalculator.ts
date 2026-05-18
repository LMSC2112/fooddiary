// frontend/src/hooks/useRecipeCalculator.ts
// FoodDiary — Custom Hook: Recipe Scaling & Unit Conversion Engine

import { useState, useMemo } from "react";

// ─────────────────────────────────────────────
// INTERFACES & TYPES
// ─────────────────────────────────────────────

export type UnitSystem = "metric" | "american";
export type BaseUnit = "g" | "ml" | string;

export interface RecipeIngredient {
  id: string;
  name: string;
  baseQuantity: number;
  baseUnit: BaseUnit;
}

export interface ScaledIngredient {
  id: string;
  name: string;
  displayQuantity: number;
  displayUnit: string;
}

export interface UseRecipeCalculatorReturn {
  desiredServings: number;
  unitSystem: UnitSystem;
  scaleFactor: number;
  scaledIngredients: ScaledIngredient[];
  isFallbackMode: boolean;
  fallbackMessage: string | null;
  setDesiredServings: (value: number) => void;
  setUnitSystem: (system: UnitSystem) => void;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const G_TO_OZ = 0.035274;
const ML_TO_CUPS_DIVISOR = 240;
const FINE_PRECISION_THRESHOLD_ML = 15;
const FINE_PRECISION_THRESHOLD_G = 15;
const ML_PER_TBSP = 15;
const ML_PER_TSP = 5;

// ─────────────────────────────────────────────
// PURE FUNCTIONS (exported for unit testing)
// ─────────────────────────────────────────────

export function computeScaleFactor(
  desiredServings: number,
  baseServings: number | null | undefined
): number {
  const safeBase = baseServings && baseServings > 0 ? baseServings : 1;
  return desiredServings / safeBase;
}

export function needsFallback(
  baseServings: number | null | undefined
): boolean {
  return baseServings === null || baseServings === undefined || baseServings <= 0;
}

export function convertGramsToAmerican(scaledGrams: number): {
  quantity: number;
  unit: string;
} {
  if (scaledGrams < FINE_PRECISION_THRESHOLD_G) {
    if (scaledGrams < ML_PER_TSP) {
      return { quantity: round(scaledGrams / ML_PER_TSP, 2), unit: "tsp" };
    }
    return { quantity: round(scaledGrams / ML_PER_TBSP, 2), unit: "tbsp" };
  }
  return { quantity: round(scaledGrams * G_TO_OZ, 2), unit: "oz" };
}

export function convertMlToAmerican(scaledMl: number): {
  quantity: number;
  unit: string;
} {
  if (scaledMl < FINE_PRECISION_THRESHOLD_ML) {
    if (scaledMl < ML_PER_TSP) {
      return { quantity: round(scaledMl / ML_PER_TSP, 2), unit: "tsp" };
    }
    return { quantity: round(scaledMl / ML_PER_TBSP, 2), unit: "tbsp" };
  }
  return { quantity: round(scaledMl / ML_TO_CUPS_DIVISOR, 2), unit: "cups" };
}

export function scaleAndConvertIngredient(
  ingredient: RecipeIngredient,
  scaleFactor: number,
  unitSystem: UnitSystem
): ScaledIngredient {
  const scaledQuantity = ingredient.baseQuantity * scaleFactor;

  if (unitSystem === "metric") {
    return {
      id: ingredient.id,
      name: ingredient.name,
      displayQuantity: round(scaledQuantity, 2),
      displayUnit: ingredient.baseUnit,
    };
  }

  if (ingredient.baseUnit === "g") {
    const { quantity, unit } = convertGramsToAmerican(scaledQuantity);
    return { id: ingredient.id, name: ingredient.name, displayQuantity: quantity, displayUnit: unit };
  }

  if (ingredient.baseUnit === "ml") {
    const { quantity, unit } = convertMlToAmerican(scaledQuantity);
    return { id: ingredient.id, name: ingredient.name, displayQuantity: quantity, displayUnit: unit };
  }

  // Non-convertible units (e.g. "unidad", "diente") — scale only
  return {
    id: ingredient.id,
    name: ingredient.name,
    displayQuantity: round(scaledQuantity, 2),
    displayUnit: ingredient.baseUnit,
  };
}

// ─────────────────────────────────────────────
// INTERNAL UTILITIES
// ─────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────

export function useRecipeCalculator(
  ingredients: RecipeIngredient[],
  baseServings: number | null | undefined
): UseRecipeCalculatorReturn {
  const fallback = needsFallback(baseServings);

  const [desiredServings, setDesiredServings] = useState<number>(
    fallback ? 1 : (baseServings as number)
  );
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");

  const scaleFactor = useMemo(
    () => computeScaleFactor(desiredServings, baseServings),
    [desiredServings, baseServings]
  );

  const scaledIngredients = useMemo(
    () => ingredients.map((ing) => scaleAndConvertIngredient(ing, scaleFactor, unitSystem)),
    [ingredients, scaleFactor, unitSystem]
  );

  return {
    desiredServings,
    unitSystem,
    scaleFactor,
    scaledIngredients,
    isFallbackMode: fallback,
    fallbackMessage: fallback
      ? "This external recipe does not specify servings. A base of 1 serving has been set to enable the calculator."
      : null,
    setDesiredServings,
    setUnitSystem,
  };
}
