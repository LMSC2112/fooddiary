// backend/src/routes/recipes.routes.js

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from "../controllers/recipes.controller.js";

const router = Router();

// Public endpoints
router.get("/", getRecipes);
router.get("/:id", getRecipeById);

// Protected endpoints — JWT required
router.post("/", authenticate, createRecipe);
router.put("/:id", authenticate, updateRecipe);
router.delete("/:id", authenticate, deleteRecipe);

export default router;
