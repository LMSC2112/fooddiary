// backend/src/index.js
// FoodDiary — Express server entry point

import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import recipeRoutes from "./routes/recipes.routes.js";
import interactionRoutes from "./routes/interaction.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? "https://fooddiary.com" : "http://localhost:80",
    credentials: true,
  })
);
app.use(express.json());

// ── Health check (required by rúbrica + Docker healthcheck) ───────────────
app.get("/health", (req, res) => {
  res.status(200).json({ status: "up" });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/interactions", interactionRoutes);

// ── 404 for unknown routes ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ── Centralized error handler (must be last) ──────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[FoodDiary API] Running on port ${PORT} — ${process.env.NODE_ENV} mode`);
});

export default app; // exported for test suite (Paso 4)
