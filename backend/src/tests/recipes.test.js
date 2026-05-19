// backend/src/tests/recipes.test.js
// FoodDiary — Integration Tests: Recipes CRUD + Authorship Rule
// Runner: Vitest + Supertest
//
// CRITICAL: These tests validate the 403 Forbidden authorship rule
// required explicitly by the rúbrica (security restriction tests).

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock("pg", () => {
  const mockQuery = vi.fn();
  const mockConnect = vi.fn(() => ({
    query: mockQuery,
    release: vi.fn(),
  }));
  const Pool = vi.fn(() => ({
    query: mockQuery,
    connect: mockConnect,
    on: vi.fn(),
  }));
  return { default: { Pool } };
});

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    // Default: token belongs to user-OWNER
    verify: vi.fn().mockReturnValue({ userId: "user-OWNER", email: "owner@test.com" }),
  },
}));

// Mock MealDB service so tests never make real HTTP calls
vi.mock("../services/mealdb.service.js", () => ({
  fetchMealsByCategory: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  fetchMealById: vi.fn().mockResolvedValue(null),
  fetchCategories: vi.fn().mockResolvedValue([]),
  searchMealsByName: vi.fn().mockResolvedValue([]),
}));

import app from "../index.js";
import pg from "pg";
import jwt from "jsonwebtoken";

const { Pool } = pg;
const poolInstance = new Pool();
const mockQuery = poolInstance.query;
const mockConnect = poolInstance.connect;

// Helper: valid auth header for tests
const AUTH_HEADER = "Bearer mock.jwt.token";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset JWT mock to owner identity by default
  jwt.verify.mockReturnValue({ userId: "user-OWNER", email: "owner@test.com" });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3 — GET /api/recipes (Public endpoint)
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/recipes", () => {
  it("returns 200 and a paginated data array without authentication", async () => {
    // Simulate count query + data query
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] }).mockResolvedValueOnce({
      rows: [
        { id: "r-1", title: "Pasta", category: "Pasta", author: "Chef Demo", source: "local" },
        { id: "r-2", title: "Pizza", category: "Italian", author: "Chef Demo", source: "local" },
      ],
    });

    const res = await request(app).get("/api/recipes");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 4 — POST /api/recipes (Protected — requires JWT)
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/recipes", () => {
  it("returns 401 when no JWT token is provided", async () => {
    const res = await request(app)
      .post("/api/recipes")
      .send({
        title: "Pasta Carbonara",
        instructions: "Cook pasta...",
        base_servings: 4,
        serving_size: "Mediano",
        ingredients: [{ name: "Pasta", base_quantity: 200, base_unit: "g" }],
      });

    // 401 Unauthorized — no token in headers
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no token/i);
  });

  it("returns 400 when serving_size has an invalid value", async () => {
    const res = await request(app)
      .post("/api/recipes")
      .set("Authorization", AUTH_HEADER)
      .send({
        title: "Pasta Carbonara",
        instructions: "Cook pasta...",
        base_servings: 4,
        serving_size: "Enorme", // Not in: Grande | Mediano | Pequeño
        ingredients: [{ name: "Pasta", base_quantity: 200, base_unit: "g" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/serving_size/i);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/recipes").set("Authorization", AUTH_HEADER).send({
      // title missing
      instructions: "Cook pasta...",
      base_servings: 4,
      serving_size: "Mediano",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 5 — DELETE /api/recipes/:id (403 Authorship Rule)
// This is the CRITICAL security test required by the rúbrica.
// ─────────────────────────────────────────────────────────────────────────────
describe("DELETE /api/recipes/:id — Authorship Rule (403 Forbidden)", () => {
  it("returns 403 when a user tries to delete another user's recipe", async () => {
    // The recipe belongs to user-OWNER
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user-OWNER" }],
    });

    // But the JWT identifies the requester as user-INTRUDER
    jwt.verify.mockReturnValue({ userId: "user-INTRUDER", email: "intruder@test.com" });

    const res = await request(app)
      .delete("/api/recipes/recipe-123")
      .set("Authorization", AUTH_HEADER);

    // 403 Forbidden — strict authorship rule
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no tienes permisos/i);
  });

  it("returns 204 when the owner deletes their own recipe", async () => {
    // Recipe belongs to user-OWNER
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: "user-OWNER" }],
    });
    // DELETE query succeeds
    mockQuery.mockResolvedValueOnce({ rows: [] });

    // JWT also identifies user-OWNER
    jwt.verify.mockReturnValue({ userId: "user-OWNER", email: "owner@test.com" });

    const res = await request(app)
      .delete("/api/recipes/recipe-123")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(204);
  });

  it("returns 404 when the recipe does not exist", async () => {
    // DB returns no rows — recipe not found
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete("/api/recipes/non-existent-id")
      .set("Authorization", AUTH_HEADER);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 6 — PUT /api/recipes/:id (403 Authorship Rule on Update)
// ─────────────────────────────────────────────────────────────────────────────
describe("PUT /api/recipes/:id — Authorship Rule (403 Forbidden)", () => {
  it("returns 403 when a user tries to update another user's recipe", async () => {
    // Setup: client connects (transaction), then owner check returns different user
    const mockClientQuery = vi.fn().mockResolvedValueOnce({ rows: [{ user_id: "user-OWNER" }] });
    mockConnect.mockReturnValueOnce({
      query: mockClientQuery,
      release: vi.fn(),
    });

    // Requester is an intruder
    jwt.verify.mockReturnValue({ userId: "user-INTRUDER", email: "intruder@test.com" });

    const res = await request(app)
      .put("/api/recipes/recipe-123")
      .set("Authorization", AUTH_HEADER)
      .send({ title: "Hacked Recipe" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no tienes permisos/i);
  });
});
