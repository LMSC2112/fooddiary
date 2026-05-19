// frontend/src/types/index.ts
// FoodDiary — Shared TypeScript interfaces
// Single source of truth for all data shapes used across components and pages.

export interface User {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// Unified recipe shape — local recipes and API recipes are normalized to this
export interface Recipe {
  id: string;
  source: "local" | "api";
  title: string;
  category: string;
  image_url: string | null;
  base_servings: number | null;
  serving_size: string | null;
  author: string;
  authorLabel: string;
  instructions?: string;
  ingredients?: RecipeIngredientRaw[];
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredientRaw {
  id: string;
  name: string;
  base_quantity: number | null;
  base_unit: string;
}

export type ServingSize = "Grande" | "Mediano" | "Pequeño";

// Interaction row from user_recipes_interaction table
export interface Interaction {
  interaction_id: string;
  local_recipe_id: string | null;
  api_recipe_id: string | null;
  api_recipe_title?: string; 
  api_recipe_image?: string | null; 
  en_todo_list: boolean;
  en_recetario: boolean;
  created_at: string;
  fecha_estado_receta: string | null;
  // Joined fields from local_recipes
  title?: string;
  image_url?: string | null;
  category?: string;
  base_servings?: number | null;
  serving_size?: string | null;
  author?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalLocal: number;
  totalApi: number;
}

export type FilterType = "all" | "new" | "discarded";
