// backend/src/routes/interaction.routes.js

import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getTodoList,
  getCookbook,
  addToTodo,
  completeRecipe,
  removeInteraction,
} from "../controllers/interaction.controller.js";

const router = Router();

// All interaction endpoints require authentication
router.use(authenticate);

router.get("/todo", getTodoList);
router.get("/cookbook", getCookbook);
router.post("/", addToTodo);
router.patch("/:id/complete", completeRecipe);
router.delete("/:id", removeInteraction);

export default router;
