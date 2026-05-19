// frontend/src/lib/api.ts
// FoodDiary — Axios instance
// Automatically attaches JWT to every request.
// Reads token from localStorage (rememberMe) or sessionStorage (session-only).

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach token if available
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("fooddiary_token") ||
    sessionStorage.getItem("fooddiary_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("fooddiary_token");
      sessionStorage.removeItem("fooddiary_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
