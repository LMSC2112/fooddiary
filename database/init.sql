-- =============================================================================
-- FoodDiary — Database Initialization Script
-- database/init.sql
-- PostgreSQL 16
-- =============================================================================

-- Enable UUID generation (required for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLE: users
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(50)   NOT NULL,
  email                  VARCHAR(100)  NOT NULL UNIQUE,
  password_hash          VARCHAR(255)  NOT NULL,
  reset_password_token   VARCHAR(255)  NULL,
  reset_password_expires TIMESTAMP     NULL,
  preferred_language     VARCHAR(5)    NOT NULL DEFAULT 'en',
  created_at             TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: local_recipes
-- =============================================================================
CREATE TABLE IF NOT EXISTS local_recipes (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(150)  NOT NULL,
  instructions  TEXT          NOT NULL,
  base_servings INTEGER       NOT NULL CHECK (base_servings > 0),
  serving_size  VARCHAR(20)   NOT NULL CHECK (serving_size IN ('Grande', 'Mediano', 'Pequeño')),
  category      VARCHAR(50)   NOT NULL DEFAULT 'Miscellaneous',
  image_url     VARCHAR(255)  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: local_ingredients
-- Cascade delete: removing a recipe wipes its ingredients automatically.
-- =============================================================================
CREATE TABLE IF NOT EXISTS local_ingredients (
  id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     UUID           NOT NULL REFERENCES local_recipes(id) ON DELETE CASCADE,
  name          VARCHAR(100)   NOT NULL,
  base_quantity NUMERIC(10,2)  NOT NULL CHECK (base_quantity > 0),
  base_unit     VARCHAR(20)    NOT NULL
);

-- =============================================================================
-- TABLE: user_recipes_interaction
-- Core table for To-Do List + Virtual Cookbook.
-- Integrity rule: exactly ONE of local_recipe_id / api_recipe_id must be set.
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_recipes_interaction (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_recipe_id     UUID         NULL REFERENCES local_recipes(id) ON DELETE CASCADE,
  api_recipe_id       VARCHAR(50)  NULL,
  en_todo_list        BOOLEAN      NOT NULL DEFAULT FALSE,
  en_recetario        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
  fecha_estado_receta TIMESTAMP    NULL,

  -- Integrity: never both null, never both filled
  CONSTRAINT chk_recipe_source CHECK (
    (local_recipe_id IS NOT NULL AND api_recipe_id IS NULL)
    OR
    (local_recipe_id IS NULL AND api_recipe_id IS NOT NULL)
  ),

  -- A user can only have one interaction row per recipe
  CONSTRAINT uq_user_local_recipe   UNIQUE (user_id, local_recipe_id),
  CONSTRAINT uq_user_api_recipe     UNIQUE (user_id, api_recipe_id)
);

-- =============================================================================
-- INDEXES — speed up the most frequent queries
-- =============================================================================

-- Recipe list by user (My Recipes screen)
CREATE INDEX IF NOT EXISTS idx_local_recipes_user_id
  ON local_recipes(user_id);

-- Recipe list by category (carousel filter)
CREATE INDEX IF NOT EXISTS idx_local_recipes_category
  ON local_recipes(category);

-- To-Do list lookup (most frequent read)
CREATE INDEX IF NOT EXISTS idx_interaction_todo
  ON user_recipes_interaction(user_id, en_todo_list);

-- Cookbook lookup
CREATE INDEX IF NOT EXISTS idx_interaction_recetario
  ON user_recipes_interaction(user_id, en_recetario);

-- =============================================================================
-- FUNCTION + TRIGGER: auto-update updated_at on local_recipes
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_local_recipes_updated_at
  BEFORE UPDATE ON local_recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_interaction_updated_at
  BEFORE UPDATE ON user_recipes_interaction
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SEED DATA (development only — safe to remove for production)
-- =============================================================================
INSERT INTO users (id, name, email, password_hash, preferred_language)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Chef Demo',
  'demo@fooddiary.com',
  -- bcrypt hash of "password123" — never store plain text
  '$2b$10$YourBcryptHashHereReplaceOnFirstRun',
  'en'
) ON CONFLICT (email) DO NOTHING;
