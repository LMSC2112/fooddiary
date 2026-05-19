# FoodDiary 🍽️

A full-stack recipe planning platform that transforms passive recipe browsing into an active cooking experience. Users discover recipes from a community library and the public MealDB API, plan their week with a To-Do list, and build a personal Virtual Cookbook of meals they've actually cooked.

---

## What it does

- **Discover recipes** from local community posts and TheMealDB public API, mixed in a single paginated grid
- **Plan your week** by adding recipes to a personal To-Do list
- **Track what you cook** with the "Did you cook this today?" flow — save to your Cookbook or just remove from the list
- **Scale any recipe** with a built-in calculator that converts servings and switches between Metric and American units (g→oz, ml→cups, with tbsp/tsp precision for small quantities)
- **Multi-language support** — switch between English and Spanish instantly
- **Secure by design** — JWT authentication, bcrypt password hashing, and strict authorship rules (you can only edit your own recipes)

---

## Tech stack

| Layer          | Technology                   |
| -------------- | ---------------------------- |
| Frontend       | React 18 + TypeScript + Vite |
| Styling        | Tailwind CSS                 |
| Animations     | Framer Motion                |
| i18n           | react-i18next                |
| Backend        | Node.js + Express            |
| Database       | PostgreSQL 16                |
| Auth           | JWT + bcrypt                 |
| Testing        | Vitest + Supertest           |
| Infrastructure | Docker + Docker Compose      |
| CI             | GitHub Actions               |

---

## Prerequisites

You only need two tools installed on your machine:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

No Node.js, no npm, no PostgreSQL — Docker handles everything.

> **Windows users:** Make sure Docker Desktop is fully started (Engine running, not just loading) before running any `docker compose` commands. On Windows with WSL2, Docker Desktop occasionally loses DNS resolution after a system restart — if containers can't reach the internet, restart Docker Desktop and try again.

---

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/fooddiary.git
cd fooddiary
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# PostgreSQL
POSTGRES_DB=fooddiary_db
POSTGRES_USER=fooddiary_user
POSTGRES_PASSWORD=choose_a_strong_password

# Backend
NODE_ENV=development
PORT=4000

# Generate a secure secret with:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=paste_your_generated_secret_here
JWT_EXPIRES_IN=7d
```

### 3. Start the application

```bash
docker compose up --build
```

First run takes ~3–5 minutes while Docker downloads images and installs dependencies. Subsequent runs take ~20 seconds.

> **Note:** Use `docker compose` (with a space) instead of `docker-compose` (with a hyphen). Newer versions of Docker Desktop ship with Compose V2 which uses the space syntax.

### 4. Open the app

| Service      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost             |
| Backend API  | http://localhost:4000        |
| Health check | http://localhost:4000/health |

---

## Creating your account

There is no pre-seeded demo account — register directly through the UI:

1. Open `http://localhost`
2. Click **Register** in the top right
3. Fill in your name, email, and password (minimum 8 characters)
4. You are logged in automatically after registering

---

## Resetting the database

If you need a completely fresh database (e.g. after schema changes):

```bash
docker compose down -v
docker compose up --build
```

The `-v` flag removes the PostgreSQL volume. The database will be recreated from `database/init.sql` on next boot.

---

## How to run the tests

Tests run inside Node.js without Docker — you need Node 20+ installed locally for this step only.

### Backend tests

```bash
cd backend
npm install
npm test
```

Expected output: **15 tests passing** across 4 suites (auth, recipes, 403 authorship rule, public endpoints).

### Frontend tests

```bash
cd frontend
npm install
npm test
```

Expected output: **17 tests passing** across 5 suites (scale factor, fallback detection, gram conversion, ml conversion, full pipeline).

### Run all tests from the root

```bash
cd backend && npm install && npm test && cd ../frontend && npm install && npm test
```

---

## Code formatting

This project uses Prettier for consistent code style. Before pushing to GitHub, format all files from the project root:

```bash
npx prettier --write .
```

The CI pipeline runs `prettier --check` automatically on every push and will fail if any file is not properly formatted.

---

## API endpoints

### Auth

| Method | Endpoint                    | Auth | Description        |
| ------ | --------------------------- | ---- | ------------------ |
| POST   | `/api/auth/register`        | —    | Create account     |
| POST   | `/api/auth/login`           | —    | Login, returns JWT |
| POST   | `/api/auth/forgot-password` | —    | Request reset link |
| POST   | `/api/auth/reset-password`  | —    | Set new password   |

### Recipes

| Method | Endpoint                               | Auth | Description                          |
| ------ | -------------------------------------- | ---- | ------------------------------------ |
| GET    | `/api/recipes?page=1&category=Chicken` | —    | Paginated hybrid list                |
| GET    | `/api/recipes/:id`                     | —    | Recipe detail                        |
| POST   | `/api/recipes`                         | ✅   | Create local recipe                  |
| PUT    | `/api/recipes/:id`                     | ✅   | Update (author only — 403 otherwise) |
| DELETE | `/api/recipes/:id`                     | ✅   | Delete (author only — 403 otherwise) |

### Interactions

| Method | Endpoint                         | Auth | Description         |
| ------ | -------------------------------- | ---- | ------------------- |
| GET    | `/api/interactions/todo`         | ✅   | User's To-Do list   |
| GET    | `/api/interactions/cookbook`     | ✅   | User's Cookbook     |
| POST   | `/api/interactions`              | ✅   | Add recipe to To-Do |
| PATCH  | `/api/interactions/:id/complete` | ✅   | Cook decision modal |
| DELETE | `/api/interactions/:id`          | ✅   | Remove interaction  |

### System

| Method | Endpoint  | Description                  |
| ------ | --------- | ---------------------------- |
| GET    | `/health` | Returns `{ "status": "up" }` |

---

## Project structure

```
fooddiary/
├── .github/workflows/ci.yml   # GitHub Actions pipeline
├── .prettierrc                 # Prettier formatting rules
├── database/init.sql           # Schema + seed data
├── backend/                    # Node.js + Express API
│   ├── .dockerignore           # Excludes node_modules from Docker build
│   └── src/
│       ├── config/             # DB connection pool
│       ├── controllers/        # Business logic
│       ├── middleware/         # JWT auth + error handler
│       ├── routes/             # API endpoints
│       ├── services/           # TheMealDB integration
│       └── tests/              # Vitest + Supertest
└── frontend/                   # React + TypeScript SPA
    ├── .dockerignore           # Excludes node_modules from Docker build
    ├── nginx.conf              # Nginx config with /api proxy and React Router support
    └── src/
        ├── components/         # Reusable UI atoms
        ├── context/            # Auth state (React Context)
        ├── hooks/              # useRecipeCalculator
        ├── lib/                # Axios client
        ├── pages/              # Full screen views
        ├── routes/             # ProtectedRoute guard
        └── types/              # Shared TypeScript interfaces
```

---

## Stopping the app

```bash
# Stop containers (keeps data)
docker compose down

# Stop and wipe the database volume (fresh start)
docker compose down -v
```

---

## Known issues on Windows

- **DNS resolution inside containers:** The `docker-compose.yml` includes explicit DNS servers (`8.8.8.8`) for the backend container. This is required on Windows with WSL2 to allow the backend to reach TheMealDB. If you see `wget: bad address` errors inside the container, restart Docker Desktop.
- **bcrypt compilation:** The `.dockerignore` files in `backend/` and `frontend/` exclude `node_modules` from the Docker build context. This prevents bcrypt binaries compiled for Windows from being copied into the Linux container, which would cause a crash.

---

## CI pipeline

Every push to `main` or `develop` automatically runs:

1. **Format check** — Prettier verifies code style across all files (breaks build if violations found)
2. **Backend tests** — Vitest runs auth and 403 authorship rule tests (15 tests)
3. **Frontend tests** — Vitest runs the recipe calculator math tests (17 tests), only if backend passes

View pipeline status in the **Actions** tab of the GitHub repository.
