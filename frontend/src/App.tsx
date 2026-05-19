// frontend/src/App.tsx
// FoodDiary — Root component
// Defines all client-side routes and wraps the app in AuthProvider.

import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./routes/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecipeDetail from "./pages/RecipeDetail";
import MyTodoList from "./pages/MyTodoList";
import MyCookbook from "./pages/MyCookbook";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recipe/:source/:id" element={<RecipeDetail />} />

          {/* Protected routes */}
          <Route
            path="/my-todo"
            element={
              <ProtectedRoute>
                <MyTodoList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-cookbook"
            element={
              <ProtectedRoute>
                <MyCookbook />
              </ProtectedRoute>
            }
          />

          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <span className="text-6xl mb-4">🍳</span>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Page not found</h1>
                <a href="/" className="text-brand-600 hover:underline text-sm">
                  Back to recipes
                </a>
              </div>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
}
