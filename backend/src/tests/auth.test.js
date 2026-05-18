// backend/src/tests/auth.test.js
// FoodDiary — Integration Tests: Authentication
// Runner: Vitest + Supertest
//
// Strategy: mock the pg pool so tests never need a real database.
// The mock intercepts pool.query() calls and returns controlled data.

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mock pg BEFORE importing anything that uses it ───────────────────────────
// vi.mock hoists to the top of the file automatically.
vi.mock("pg", () => {
  const mockQuery = vi.fn();
  const Pool = vi.fn(() => ({
    query: mockQuery,
    on: vi.fn(),
  }));
  return { default: { Pool } };
});

// ── Mock bcrypt to avoid slow hashing in tests ────────────────────────────────
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$hashed_password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// ── Mock jsonwebtoken ─────────────────────────────────────────────────────────
vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn().mockReturnValue("mock.jwt.token"),
    verify: vi.fn().mockReturnValue({ userId: "user-123", email: "test@test.com" }),
  },
}));

// Import app AFTER mocks are set up
import app from "../index.js";
import pg from "pg";

// Get reference to the mocked query function
const { Pool } = pg;
const mockQuery = new Pool().query;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1 — POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  it("returns 201 and a JWT token when registration succeeds", async () => {
    // Simulate DB returning the new user row
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "user-123",
          name: "Chef Demo",
          email: "demo@fooddiary.com",
          preferred_language: "en",
          created_at: new Date().toISOString(),
        },
      ],
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Chef Demo",
      email: "demo@fooddiary.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe("demo@fooddiary.com");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "demo@fooddiary.com",
      // name and password missing
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Chef Demo",
      email: "demo@fooddiary.com",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/i);
  });

  it("returns 409 when email is already registered", async () => {
    // Simulate Postgres unique constraint violation (error code 23505)
    const uniqueViolationError = new Error("duplicate key value");
    uniqueViolationError.code = "23505";
    mockQuery.mockRejectedValueOnce(uniqueViolationError);

    const res = await request(app).post("/api/auth/register").send({
      name: "Chef Demo",
      email: "existing@fooddiary.com",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2 — POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  it("returns 200 and a JWT token with valid credentials", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "user-123",
          name: "Chef Demo",
          email: "demo@fooddiary.com",
          password_hash: "$hashed_password",
          preferred_language: "en",
        },
      ],
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "demo@fooddiary.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.token).toBe("mock.jwt.token");
  });

  it("returns 401 when email does not exist", async () => {
    // Simulate DB returning no user
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@fooddiary.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it("returns 400 when email or password are missing", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "demo@fooddiary.com",
      // password missing
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
