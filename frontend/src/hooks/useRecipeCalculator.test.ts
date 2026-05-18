// frontend/src/hooks/useRecipeCalculator.test.ts
// FoodDiary — Test Suite: Paso 1 (Calculadora)
// Runner: Vitest  |  Command: vitest run

import { describe, it, expect } from "vitest";
import {
  computeScaleFactor,
  needsFallback,
  convertGramsToAmerican,
  convertMlToAmerican,
  scaleAndConvertIngredient,
  RecipeIngredient,
} from "./useRecipeCalculator";

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1 — Scale Factor Calculation
// Validates F = P_nueva / P_original and the unitario fallback.
// ─────────────────────────────────────────────────────────────────────────────
describe("computeScaleFactor", () => {
  it("calculates correctly when doubling servings", () => {
    expect(computeScaleFactor(8, 4)).toBe(2);
  });

  it("calculates correctly when halving servings", () => {
    expect(computeScaleFactor(2, 4)).toBe(0.5);
  });

  it("applies unit fallback (base = 1) when baseServings is null", () => {
    expect(computeScaleFactor(3, null)).toBe(3);
  });

  it("applies unit fallback when baseServings is 0 (corrupt data)", () => {
    expect(computeScaleFactor(5, 0)).toBe(5);
  });

  it("returns 1 when desired servings match the base", () => {
    expect(computeScaleFactor(4, 4)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2 — Fallback Mode Detection
// ─────────────────────────────────────────────────────────────────────────────
describe("needsFallback", () => {
  it("returns true for null baseServings (external API recipe)", () => {
    expect(needsFallback(null)).toBe(true);
  });

  it("returns true for undefined baseServings", () => {
    expect(needsFallback(undefined)).toBe(true);
  });

  it("returns true for baseServings = 0 (invalid data)", () => {
    expect(needsFallback(0)).toBe(true);
  });

  it("returns false for valid baseServings (local recipe)", () => {
    expect(needsFallback(4)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3 — Grams to American System Conversion
// Validates standard (oz) and culinary precision (tbsp / tsp).
// ─────────────────────────────────────────────────────────────────────────────
describe("convertGramsToAmerican", () => {
  it("converts 250g to oz correctly (standard case)", () => {
    // 250 * 0.035274 = 8.8185 → rounded to 8.82
    const result = convertGramsToAmerican(250);
    expect(result.unit).toBe("oz");
    expect(result.quantity).toBe(8.82);
  });

  it("converts to tbsp when value is between 5g and 14.99g", () => {
    // 10g / 15 = 0.67 tbsp
    const result = convertGramsToAmerican(10);
    expect(result.unit).toBe("tbsp");
    expect(result.quantity).toBe(0.67);
  });

  it("converts to tsp when value is under 5g (maximum precision)", () => {
    // 3g / 5 = 0.6 tsp
    const result = convertGramsToAmerican(3);
    expect(result.unit).toBe("tsp");
    expect(result.quantity).toBe(0.6);
  });

  it("converts exactly 15g to oz (threshold boundary — not tbsp)", () => {
    const result = convertGramsToAmerican(15);
    expect(result.unit).toBe("oz");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4 — Milliliters to American System Conversion
// Validates standard (cups) and culinary precision (tbsp / tsp).
// ─────────────────────────────────────────────────────────────────────────────
describe("convertMlToAmerican", () => {
  it("converts 480ml to cups correctly (exactly 2 cups)", () => {
    const result = convertMlToAmerican(480);
    expect(result.unit).toBe("cups");
    expect(result.quantity).toBe(2);
  });

  it("converts 360ml to 1.5 cups", () => {
    const result = convertMlToAmerican(360);
    expect(result.unit).toBe("cups");
    expect(result.quantity).toBe(1.5);
  });

  it("converts to tbsp when value is between 5ml and 14.99ml", () => {
    // 10ml / 15 = 0.67 tbsp
    const result = convertMlToAmerican(10);
    expect(result.unit).toBe("tbsp");
    expect(result.quantity).toBe(0.67);
  });

  it("converts to tsp when value is under 5ml", () => {
    // 2.5ml / 5 = 0.5 tsp
    const result = convertMlToAmerican(2.5);
    expect(result.unit).toBe("tsp");
    expect(result.quantity).toBe(0.5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — Full Pipeline: Scale + Convert
// Simulates the end-to-end flow the hook uses in production.
// ─────────────────────────────────────────────────────────────────────────────
describe("scaleAndConvertIngredient — full pipeline", () => {
  const flour: RecipeIngredient = {
    id: "ing-001",
    name: "Wheat flour",
    baseQuantity: 250,
    baseUnit: "g",
  };

  const milk: RecipeIngredient = {
    id: "ing-002",
    name: "Whole milk",
    baseQuantity: 240,
    baseUnit: "ml",
  };

  const eggs: RecipeIngredient = {
    id: "ing-003",
    name: "Eggs",
    baseQuantity: 2,
    baseUnit: "unidad",
  };

  it("scales 250g flour x2 in metric system → 500g", () => {
    const result = scaleAndConvertIngredient(flour, 2, "metric");
    expect(result.displayQuantity).toBe(500);
    expect(result.displayUnit).toBe("g");
  });

  it("scales 250g flour x2 and converts to oz in american system → 17.64oz", () => {
    // 500g * 0.035274 = 17.637 → 17.64
    const result = scaleAndConvertIngredient(flour, 2, "american");
    expect(result.displayQuantity).toBe(17.64);
    expect(result.displayUnit).toBe("oz");
  });

  it("scales 240ml milk x1 and converts to cups → exactly 1 cup", () => {
    const result = scaleAndConvertIngredient(milk, 1, "american");
    expect(result.displayQuantity).toBe(1);
    expect(result.displayUnit).toBe("cups");
  });

  it("scales countable units (eggs) x1.5 without changing the unit → 3 units", () => {
    const result = scaleAndConvertIngredient(eggs, 1.5, "american");
    expect(result.displayQuantity).toBe(3);
    expect(result.displayUnit).toBe("unidad");
  });

  it("applies unit fallback in full pipeline: API recipe, 3 desired servings", () => {
    // baseServings = null → factor = 3/1 = 3 → 250g * 3 = 750g
    const factor = computeScaleFactor(3, null);
    const result = scaleAndConvertIngredient(flour, factor, "metric");
    expect(result.displayQuantity).toBe(750);
    expect(result.displayUnit).toBe("g");
  });
});
