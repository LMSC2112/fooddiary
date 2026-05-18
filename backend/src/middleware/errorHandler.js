// backend/src/middleware/errorHandler.js
// Centralized error handler — must be registered LAST in Express middleware chain.
// Any controller calling next(err) lands here.

export function errorHandler(err, req, res, next) {
  // Log full error server-side (never expose stack traces to client)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message);

  // Postgres unique violation (email already registered)
  if (err.code === "23505") {
    return res.status(409).json({ error: "A user with that email already exists." });
  }

  // Postgres foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced resource does not exist." });
  }

  // Postgres check constraint violation (e.g. serving_size or recipe source)
  if (err.code === "23514") {
    return res.status(400).json({ error: "Data integrity constraint violated." });
  }

  // Generic fallback
  const status = err.status || 500;
  const message = err.status ? err.message : "Internal server error.";
  return res.status(status).json({ error: message });
}
