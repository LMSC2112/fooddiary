// backend/src/controllers/auth.controller.js
// Handles: register, login, forgotPassword, resetPassword

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../config/db.js";

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    // 400 — missing fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 409 is handled by errorHandler if unique constraint fires
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, preferred_language, created_at`,
      [name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);

    // Return 401 (not 404) — don't reveal whether email exists
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // rememberMe → 30d expiry; otherwise → 1d
    const expiresIn = rememberMe ? "30d" : process.env.JWT_EXPIRES_IN || "1d";
    const token = signToken(user, expiresIn);

    return res.status(200).json({
      token,
      // rememberMe tells the frontend whether to use localStorage vs sessionStorage
      rememberMe: !!rememberMe,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferred_language: user.preferred_language,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const result = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase().trim(),
    ]);

    // Always return 200 — don't reveal whether email is registered (security)
    if (result.rows.length === 0) {
      return res.status(200).json({
        message: "If that email is registered, a reset link has been sent.",
      });
    }

    const userId = result.rows[0].id;

    // Single-use token valid for 15 minutes
    const rawToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET reset_password_token = $1, reset_password_expires = $2
       WHERE id = $3`,
      [rawToken, expires, userId]
    );

    // In production: send email with link → https://fooddiary.com/reset-password?token=rawToken
    // For this portfolio build, we return the token in the response for testability
    console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);

    return res.status(200).json({
      message: "If that email is registered, a reset link has been sent.",
      // Remove devToken from production build
      devToken: process.env.NODE_ENV === "development" ? rawToken : undefined,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const result = await pool.query(
      `SELECT id FROM users
       WHERE reset_password_token = $1
         AND reset_password_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Reset token is invalid or has expired." });
    }

    const userId = result.rows[0].id;
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      `UPDATE users
       SET password_hash = $1,
           reset_password_token = NULL,
           reset_password_expires = NULL
       WHERE id = $2`,
      [password_hash, userId]
    );

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// INTERNAL HELPER
// ─────────────────────────────────────────────
function signToken(user, expiresIn = process.env.JWT_EXPIRES_IN || "1d") {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn });
}
