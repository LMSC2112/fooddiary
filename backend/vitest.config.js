// backend/vitest.config.js
// FoodDiary — Vitest configuration for the backend test suite

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test files location
    include: ["src/tests/**/*.test.js"],
    // Run each test file in isolation (prevents mock state leaking between files)
    isolate: true,
    // Environment: Node.js (not browser)
    environment: "node",
    // Show verbose output in CI
    reporter: process.env.CI ? "verbose" : "default",
    // Global test timeout (ms) — supertest requests can be slow in CI
    testTimeout: 10000,
  },
});
