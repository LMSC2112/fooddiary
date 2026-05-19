// backend/src/controllers/interaction.controller.js
// Manages user_recipes_interaction: To-Do list and Virtual Cookbook state.
// All endpoints require authentication (JWT).

import pool from "../config/db.js";

// ─────────────────────────────────────────────
// GET /api/interactions/todo
// Returns all recipes the user has in their To-Do list.
// ─────────────────────────────────────────────
export async function getTodoList(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         i.id AS interaction_id,
         i.local_recipe_id,
         i.api_recipe_id,
         i.en_todo_list,
         i.en_recetario,
         i.created_at,
         i.fecha_estado_receta,
         i.api_recipe_title,
         i.api_recipe_image,
         -- Local recipe fields (null if it's an API recipe)
         lr.title,
         lr.image_url,
         lr.category,
         lr.base_servings,
         lr.serving_size,
         u.name AS author
       FROM user_recipes_interaction i
       LEFT JOIN local_recipes lr ON lr.id = i.local_recipe_id
       LEFT JOIN users u ON u.id = lr.user_id
       WHERE i.user_id = $1 AND i.en_todo_list = TRUE
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/interactions/cookbook
// Returns all recipes the user has saved to their Virtual Cookbook.
// ─────────────────────────────────────────────
export async function getCookbook(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         i.id AS interaction_id,
         i.local_recipe_id,
         i.api_recipe_id,
         i.en_todo_list,
         i.en_recetario,
         i.created_at,
         i.fecha_estado_receta,
         lr.title,
         lr.image_url,
         lr.category,
         lr.base_servings,
         lr.serving_size,
         u.name AS author
       FROM user_recipes_interaction i
       LEFT JOIN local_recipes lr ON lr.id = i.local_recipe_id
       LEFT JOIN users u ON u.id = lr.user_id
       WHERE i.user_id = $1 AND i.en_recetario = TRUE
       ORDER BY i.fecha_estado_receta DESC`,
      [userId]
    );

    return res.status(200).json({ data: result.rows });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/interactions
// Adds a recipe to the user's To-Do list.
// Body: { local_recipe_id? } OR { api_recipe_id? }
// Handles the "Discarded → re-add" secondary workflow.
// ─────────────────────────────────────────────
export async function addToTodo(req, res, next) {
  try {
    const userId = req.user.userId;
    const { local_recipe_id, api_recipe_id, title, image_url } = req.body;
    // Validate: exactly one source must be provided
    if ((!local_recipe_id && !api_recipe_id) || (local_recipe_id && api_recipe_id)) {
      return res.status(400).json({
        error: "Provide exactly one of: local_recipe_id or api_recipe_id.",
      });
    }

    // Check for existing interaction (previously cooked or discarded)
    const existing = await pool.query(
      `SELECT id, en_todo_list, en_recetario, fecha_estado_receta
       FROM user_recipes_interaction
       WHERE user_id = $1
         AND (local_recipe_id = $2 OR api_recipe_id = $3)`,
      [userId, local_recipe_id || null, api_recipe_id || null]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];

      // Already in To-Do — idempotent, return as-is
      if (row.en_todo_list) {
        return res.status(200).json({ message: "Recipe already in To-Do list.", data: row });
      }

      // Previously discarded → re-add workflow
      // Frontend should have shown the "Are you sure?" confirmation before calling this
      const updated = await pool.query(
        `UPDATE user_recipes_interaction
         SET en_todo_list = TRUE,
             en_recetario = FALSE,
             created_at = NOW(),
             fecha_estado_receta = NULL
         WHERE id = $1
         RETURNING *`,
        [row.id]
      );
      return res
        .status(200)
        .json({ message: "Recipe re-added to To-Do list.", data: updated.rows[0] });
    }

    // New interaction
    const result = await pool.query(
      `INSERT INTO user_recipes_interaction
         (user_id, local_recipe_id, api_recipe_id, api_recipe_title, api_recipe_image, en_todo_list, en_recetario)
        VALUES ($1, $2, $3, $4, $5, TRUE, FALSE)
        RETURNING *`,
      [userId, local_recipe_id || null, api_recipe_id || null, title || null, image_url || null]
    );

    return res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// PATCH /api/interactions/:id/complete
// "Did you cook this today?" decision modal.
// Body: { action: "save_to_cookbook" | "just_remove" }
// ─────────────────────────────────────────────
export async function completeRecipe(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { action } = req.body;

    if (!["save_to_cookbook", "just_remove"].includes(action)) {
      return res.status(400).json({
        error: 'action must be "save_to_cookbook" or "just_remove".',
      });
    }

    // Ownership check — users can only update their own interactions
    const ownerCheck = await pool.query(
      "SELECT id FROM user_recipes_interaction WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Interaction not found." });
    }

    let updated;

    if (action === "save_to_cookbook") {
      // en_todo_list = false, en_recetario = true, stamp the cooked date
      updated = await pool.query(
        `UPDATE user_recipes_interaction
         SET en_todo_list = FALSE,
             en_recetario = TRUE,
             fecha_estado_receta = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
    } else {
      // just_remove: en_todo_list = false, keep record for history
      updated = await pool.query(
        `UPDATE user_recipes_interaction
         SET en_todo_list = FALSE,
             fecha_estado_receta = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
    }

    return res.status(200).json({ data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/interactions/:id
// Removes a recipe from cookbook (full delete of the interaction row).
// ─────────────────────────────────────────────
export async function removeInteraction(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      "DELETE FROM user_recipes_interaction WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Interaction not found." });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}
