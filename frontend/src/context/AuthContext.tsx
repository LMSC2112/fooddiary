// frontend/src/context/AuthContext.tsx
// FoodDiary — Authentication context
// Provides user state and login/logout helpers to the entire component tree.

import React, { createContext, useContext, useState, useEffect } from "react";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, rememberMe: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("fooddiary_token") ||
      sessionStorage.getItem("fooddiary_token")
  );
  const [user, setUser] = useState<User | null>(() => {
    const stored =
      localStorage.getItem("fooddiary_user") ||
      sessionStorage.getItem("fooddiary_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Persist language preference when user changes
  useEffect(() => {
    if (user?.preferred_language) {
      localStorage.setItem("fooddiary_lang", user.preferred_language);
    }
  }, [user]);

  function login(newToken: string, newUser: User, rememberMe: boolean) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("fooddiary_token", newToken);
    storage.setItem("fooddiary_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("fooddiary_token");
    localStorage.removeItem("fooddiary_user");
    sessionStorage.removeItem("fooddiary_token");
    sessionStorage.removeItem("fooddiary_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
