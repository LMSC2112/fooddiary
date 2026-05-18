// backend/src/services/mealdb.service.js
// All communication with TheMealDB lives here.
// Controllers never call fetch() directly — they use this service.

const BASE_URL = process.env.MEALDB_BASE_URL || "https://www.themealdb.com/api/json/v1/1";

/**
 * Normalizes a raw MealDB meal object into the same shape
 * as a local recipe, so the frontend receives a unified type.
 */
function normalizeMeal(meal) {
  // MealDB stores ingredients as strIngredient1..20 + strMeasure1..20
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({
        id: `api-ing-${meal.idMeal}-${i}`,
        name: name.trim(),
        // MealDB doesn't provide structured quantity/unit — raw measure string only
        baseQuantity: null,
        baseUnit: measure ? measure.trim() : "",
      });
    }
  }

  return {
    id: meal.idMeal,
    source: "api",
    title: meal.strMeal,
    category: meal.strCategory || "Miscellaneous",
    instructions: meal.strInstructions,
    // MealDB recipes have no structured base_servings → fallback mode in calculator
    base_servings: null,
    serving_size: null,
    image_url: meal.strMealThumb,
    author: "Public Library",
    ingredients,
    created_at: null,
  };
}

/**
 * Fetches paginated meals from MealDB by category.
 * MealDB free tier doesn't support true pagination, so we simulate it
 * by fetching all meals in a category and slicing client-requested pages.
 */
export async function fetchMealsByCategory(category = "Chicken", page = 1, limit = 30) {
  const url = `${BASE_URL}/filter.php?c=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB error: ${res.status}`);
  const data = await res.json();

  const allMeals = (data.meals || []).map((m) => ({
    id: m.idMeal,
    source: "api",
    title: m.strMeal,
    image_url: m.strMealThumb,
    category,
    author: "Public Library",
    base_servings: null,
  }));

  const offset = (page - 1) * limit;
  return {
    data: allMeals.slice(offset, offset + limit),
    total: allMeals.length,
  };
}

/**
 * Fetches the full detail of a single MealDB recipe by its ID.
 */
export async function fetchMealById(mealId) {
  const url = `${BASE_URL}/lookup.php?i=${encodeURIComponent(mealId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB error: ${res.status}`);
  const data = await res.json();

  if (!data.meals || data.meals.length === 0) return null;
  return normalizeMeal(data.meals[0]);
}

/**
 * Fetches all available categories from MealDB.
 * Used by the category carousel on the home screen.
 */
export async function fetchCategories() {
  const url = `${BASE_URL}/categories.php`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB error: ${res.status}`);
  const data = await res.json();

  return (data.categories || []).map((c) => ({
    id: c.idCategory,
    name: c.strCategory,
    thumbnail: c.strCategoryThumb,
    description: c.strCategoryDescription,
  }));
}

/**
 * Searches MealDB meals by name string.
 */
export async function searchMealsByName(query) {
  const url = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MealDB error: ${res.status}`);
  const data = await res.json();

  return (data.meals || []).map(normalizeMeal);
}
