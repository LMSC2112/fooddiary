// backend/src/controllers/recipes.controller.js
// CRUD for local_recipes + hybrid list merging local + MealDB results.
// Enforces the Authorship Rule: 403 Forbidden if user edits/deletes others' recipes.

import pool from "../config/db.js";
import { fetchMealsByCategory, fetchMealById, searchMealsByName } from "../services/mealdb.service.js";

const VALID_SERVING_SIZES = ["Grande", "Mediano", "Pequeño"];
const PAGE_LIMIT = 30;

// ─────────────────────────────────────────────
// GET /api/recipes
// Public. Returns merged local + MealDB results with pagination.
// Query params: ?page=1&category=Chicken&search=pasta&filter=new|discarded
// ─────────────────────────────────────────────
export async function getRecipes(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const category = req.query.category || null;
    const search = req.query.search || null;
    const offset = (page - 1) * PAGE_LIMIT;

    // ── Local recipes ──────────────────────────────────────────────────────
    let localQuery = `
      SELECT
        lr.id, lr.title, lr.category, lr.image_url, lr.base_servings,
        lr.serving_size, lr.created_at, lr.updated_at,
        u.name AS author,
        'local' AS source
      FROM local_recipes lr
      JOIN users u ON u.id = lr.user_id
    `;
    const params = [];
    const conditions = [];

    if (category) {
      params.push(category);
      conditions.push(`lr.category = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`lr.title ILIKE $${params.length}`);
    }
    if (conditions.length > 0) {
      localQuery += " WHERE " + conditions.join(" AND ");
    }

    // Count total for pagination metadata
    const countQuery = `SELECT COUNT(*) FROM (${localQuery}) sub`;
    const countResult = await pool.query(countQuery, params);
    const totalLocal = parseInt(countResult.rows[0].count);

    localQuery += ` ORDER BY lr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(PAGE_LIMIT, offset);

    const localResult = await pool.query(localQuery, params);
    const localRecipes = localResult.rows.map((r) => ({
      ...r,
      authorLabel: `By: ${r.author}`,
    }));

    // ── MealDB recipes (parallel fetch) ───────────────────────────────────
    let apiRecipes = [];
    let totalApi = 0;

    try {
      const mealCategory = category || "Chicken";
      const { data, total } = await fetchMealsByCategory(mealCategory, page, PAGE_LIMIT);
      apiRecipes = data.map((m) => ({ ...m, authorLabel: "From: Public Library" }));
      totalApi = total;
    } catch (apiErr) {
      // MealDB being down should NOT crash the whole endpoint
      console.warn("MealDB fetch failed (degraded mode):", apiErr.message);
    }

    // ── Merge: local first, then API ───────────────────────────────────────
    const merged = [...localRecipes, ...apiRecipes].slice(0, PAGE_LIMIT);

    return res.status(200).json({
      data: merged,
      pagination: {
        page,
        limit: PAGE_LIMIT,
        totalLocal,
        totalApi,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/recipes/:id
// Public. Returns full detail of local or API recipe.
// ─────────────────────────────────────────────
export async function getRecipeById(req, res, next) {
  try {
    const { id } = req.params;

    // Try local DB first
    const localResult = await pool.query(
      `SELECT
         lr.*,
         u.name AS author,
         'local' AS source,
         json_agg(
           json_build_object(
             'id', li.id,
             'name', li.name,
             'baseQuantity', li.base_quantity,
             'baseUnit', li.base_unit
           ) ORDER BY li.id
         ) AS ingredients
       FROM local_recipes lr
       JOIN users u ON u.id = lr.user_id
       LEFT JOIN local_ingredients li ON li.recipe_id = lr.id
       WHERE lr.id = $1
       GROUP BY lr.id, u.name`,
      [id]
    );

    if (localResult.rows.length > 0) {
      const recipe = localResult.rows[0];
      return res.status(200).json({
        ...recipe,
        authorLabel: `By: ${recipe.author}`,
      });
    }

    // Not local — try MealDB
    const apiRecipe = await fetchMealById(id);
    if (!apiRecipe) {
      return res.status(404).json({ error: "Recipe not found." });
    }

    return res.status(200).json({ ...apiRecipe, authorLabel: "From: Public Library" });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/recipes
// Protected. Creates a local recipe with its ingredients.
// ─────────────────────────────────────────────
export async function createRecipe(req, res, next) {
  const client = await pool.connect();
  try {
    const { title, instructions, base_servings, serving_size, category, image_url, ingredients } = req.body;
    const userId = req.user.userId;

    // ── Validation (400) ───────────────────────────────────────────────────
    if (!title || !instructions || !base_servings || !serving_size) {
      return res.status(400).json({
        error: "Title, instructions, base_servings, and serving_size are required.",
      });
    }
    if (!VALID_SERVING_SIZES.includes(serving_size)) {
      return res.status(400).json({
        error: `serving_size must be one of: ${VALID_SERVING_SIZES.join(", ")}.`,
      });
    }
    if (!Number.isInteger(base_servings) || base_servings < 1) {
      return res.status(400).json({ error: "base_servings must be a positive integer." });
    }
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "At least one ingredient is required." });
    }

    // ── Transaction ────────────────────────────────────────────────────────
    await client.query("BEGIN");

    const recipeResult = await client.query(
      `INSERT INTO local_recipes (user_id, title, instructions, base_servings, serving_size, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title.trim(), instructions.trim(), base_servings, serving_size, category || "Miscellaneous", image_url || null]
    );
    const recipe = recipeResult.rows[0];

    // Insert all ingredients in one batched query
    for (const ing of ingredients) {
      if (!ing.name || !ing.base_quantity || !ing.base_unit) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Each ingredient needs name, base_quantity, and base_unit." });
      }
      await client.query(
        `INSERT INTO local_ingredients (recipe_id, name, base_quantity, base_unit)
         VALUES ($1, $2, $3, $4)`,
        [recipe.id, ing.name.trim(), ing.base_quantity, ing.base_unit.trim()]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json(recipe);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// PUT /api/recipes/:id
// Protected. Updates a local recipe.
// 403 if the requesting user is not the author.
// ─────────────────────────────────────────────
export async function updateRecipe(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, instructions, base_servings, serving_size, category, image_url, ingredients } = req.body;

    // ── Authorship Rule ────────────────────────────────────────────────────
    const ownerCheck = await client.query(
      "SELECT user_id FROM local_recipes WHERE id = $1",
      [id]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found." });
    }
    if (ownerCheck.rows[0].user_id !== userId) {
      // 403 Forbidden — enforced strictly per spec
      return res.status(403).json({
        error: "No tienes permisos para modificar una receta que no te pertenece.",
      });
    }

    // ── Validation ─────────────────────────────────────────────────────────
    if (serving_size && !VALID_SERVING_SIZES.includes(serving_size)) {
      return res.status(400).json({
        error: `serving_size must be one of: ${VALID_SERVING_SIZES.join(", ")}.`,
      });
    }

    await client.query("BEGIN");

    const updated = await client.query(
      `UPDATE local_recipes
       SET title         = COALESCE($1, title),
           instructions  = COALESCE($2, instructions),
           base_servings = COALESCE($3, base_servings),
           serving_size  = COALESCE($4, serving_size),
           category      = COALESCE($5, category),
           image_url     = COALESCE($6, image_url)
       WHERE id = $7
       RETURNING *`,
      [title || null, instructions || null, base_servings || null,
       serving_size || null, category || null, image_url || null, id]
    );

    // If new ingredients provided, replace them all (simpler than diffing)
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      await client.query("DELETE FROM local_ingredients WHERE recipe_id = $1", [id]);
      for (const ing of ingredients) {
        await client.query(
          `INSERT INTO local_ingredients (recipe_id, name, base_quantity, base_unit)
           VALUES ($1, $2, $3, $4)`,
          [id, ing.name.trim(), ing.base_quantity, ing.base_unit.trim()]
        );
      }
    }

    await client.query("COMMIT");
    return res.status(200).json(updated.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────
// DELETE /api/recipes/:id
// Protected. Deletes a local recipe.
// 403 if the requesting user is not the author.
// ─────────────────────────────────────────────
export async function deleteRecipe(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // ── Authorship Rule ────────────────────────────────────────────────────
    const ownerCheck = await pool.query(
      "SELECT user_id FROM local_recipes WHERE id = $1",
      [id]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Recipe not found." });
    }
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({
        error: "No tienes permisos para modificar una receta que no te pertenece.",
      });
    }

    // CASCADE DELETE handles local_ingredients and user_recipes_interaction
    await pool.query("DELETE FROM local_recipes WHERE id = $1", [id]);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
