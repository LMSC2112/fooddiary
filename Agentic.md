# FoodDiary — AI-Assisted Development Report

---

## 1. Tools Used and Their Real Roles

This project was built with the assistance of four artificial intelligence tools, each with a distinct and complementary role. The important thing to understand is that none of them operated autonomously; all were directed, questioned, and validated by the developer at every stage.

**Claude (Anthropic)** was the primary architecture and coding assistant. It was responsible for designing the complete monorepo structure, generating the six development steps in incremental order, writing the backend and frontend code, building the CI pipeline, and accompanying the debugging process through to deployment. Claude made no design decisions without first being questioned about the reasoning behind each choice.

**Gemini (Google)** acted as an external technical consultant and architecture validator. Before the development phase began, the creative process and technical requirements were worked out with Gemini, who helped refine the specification documents that were later delivered as context to Claude. During development, Gemini was consulted as a second opinion during blocking moments, especially during React production errors, to contrast diagnoses and question whether the path being taken was correct.

**ChatGPT (OpenAI)** was used primarily as an infrastructure debugging assistant. When Docker produced build errors, when containers crashed due to native binary incompatibilities with `bcrypt`, or when the internal DNS of the containers could not resolve external domains, ChatGPT was the reference point for understanding what was happening at the operating system and container level.

**GitHub Copilot** operated as an in-editor assistant within VS Code. Its use was specific: it suggested corrections for lines flagged in red or yellow by the TypeScript and CSS Language Server. The consistent pattern was that those suggestions were validated with Claude before being applied, avoiding changes that resolved a symptom without understanding the cause.

---

## 2. Development Methodology and Project Timeline

### The Decision That Defined Everything

FoodDiary did not begin with code; it began with a conversation. In a phase prior to technical development, the system architecture was built with Gemini through working sessions where technical decisions were debated, alternatives explored, and criteria consolidated. When a session reached a satisfying level of maturity, a specification document was generated capturing everything agreed upon up to that point. That document was not the destination but a checkpoint; the next session took it as a base, questioned it, and improved it until producing the next one.

The final document was the result of that cumulative process. The one immediately preceding it had its own value in the details of microinteractions and user experience: Framer Motion animations, Skeleton Screens, Optimistic Updates, which the final omitted for reasons of length. Those points were explicitly rescued and delivered to Claude as an instruction at the start of development, alongside the previously validated UML diagram.

One of the products of that phase was the layered monorepo architecture, defined before a single line of code was written:

```
fooddiary-monorepo/
│
├── .github/workflows/
│   └── ci.yml
│
├── frontend/
│   ├── src/
│   │   ├── assets/locales/       # en.json / es.json
│   │   ├── components/           # Navbar, RecipeCard, CategoryCarousel,
│   │   │                         # SkeletonCard, Modal, PaginationControls
│   │   ├── pages/                # Home, Login, Register, MyTodoList,
│   │   │                         # MyCookbook, RecipeDetail
│   │   ├── hooks/
│   │   │   └── useRecipeCalculator.ts
│   │   ├── routes/               # ProtectedRoute.tsx + route definitions
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── Dockerfile
│   └── package.json
│
├── database/
│   └── init.sql
│
└── docker-compose.yml
```

This structure guaranteed strict separation of concerns from the start: the presentation layer never touches the database directly, business logic lives in the backend controllers, and infrastructure is completely isolated in its own configuration files. The result was that the database schema was correct from the first boot, with no structural migrations needed throughout the entire project.

### The Incremental Methodology as a Contract

The development methodology was defined explicitly as a working contract before writing any code:

- One step at a time
- No advancing to the next step without explicit validation
- No solving everything at once

This was not a suggestion from the AI; it was a decision made by the developer. The result was a commit history that tells the real story of how the project was built, and a process where every component was understood before being accepted.

### Timeline of the Six Steps

**Step 1, the calculator as the mathematical core:** The pure logic for portion scaling and unit conversion was implemented first in TypeScript, completely isolated from React. The mathematical functions were exported independently of the hook so they could be tested without mounting any component. Seventeen test cases were written covering standard conversions, fine culinary precision, and the fallback mode for external recipes without defined base servings.

**Step 2, infrastructure before application:** The `init.sql` with four tables, indexes, and `updated_at` triggers was defined before touching the server. The Dockerfiles, a backend with `dumb-init` for correct signal handling and a multi-stage frontend that produces a ~25MB image with only Nginx, and the `docker-compose.yml` with real healthchecks were built before a single API route existed.

**Step 3, backend with strict business rules:** The Express server was built with clear separation between routes, controllers, middleware, and services. The authorship rule, that a user can only modify their own recipes, was implemented as a database-level validation before any write operation, returning `403 Forbidden` with a specific message when violated.

**Step 4, tests as documentation of intent:** The backend integration tests use PostgreSQL and JWT mocks to be completely independent of the database. The tests do not prove that the code exists; they prove that the code behaves correctly against invalid inputs, wrong user tokens, and security restrictions.

**Step 5, CI as continuous quality assurance:** The GitHub Actions pipeline was configured with two dependent jobs: the backend must pass before the frontend is evaluated. Dependency caching, cancellation of obsolete runs with `concurrency`, and strict format verification with Prettier that breaks the build on style inconsistencies were all included.

**Step 6, interface built on type contracts:** All React components consume types defined in a single `types/index.ts` file. The calculator hook is the only source of mathematical logic; components only render clean data. Framer Motion animations, Skeleton Screens, and Optimistic Updates were implemented as layers on top of functionality, not intertwined with logic.

---

## 3. Key Prompts and the Thinking Behind Them

### Prompt 1, The Methodological Contract

Before starting development, Claude was given not just the specification documents but also an explicit six-step working methodology, reconciliation rules for contradictory documents, and the instruction not to advance without validation. Claude's response included three clarifying questions, about database columns, about fields in the final UML, and about whether to include the tests alongside the Step 1 hook, all answered before any code was written.

What is relevant about this prompt is not what it generated, but what it forced: the AI had to read, understand, and ask before producing. An AI that starts coding without asking anything is a signal that it did not understand the problem.

### Prompt 2, The Blank Page That Nobody Could Find

During local deployment, the application loaded briefly and then showed a blank screen. The console error was `TypeError: Cannot read properties of undefined (reading 'length')` with a stack trace pointing to a Vite-compiled file that was impossible to read directly.

Instead of waiting for the AI to solve the problem, the decision was made to investigate independently in DevTools. Navigating to the Sources tab, the actual compiled files were found and the exact line of the error was traced. That file was shared directly with Claude for analysis. In parallel, the same error was consulted with ChatGPT and Gemini to obtain independent diagnoses.

The use of multiple sources was intentional: when one AI gets stuck or proposes solutions that do not work, consulting another with the same problem generates different perspectives that allow triangulating the real cause. In this case, the error was not where any AI had initially looked; it was in how `pagination` arrived as `undefined` from the backend before React finished rendering.

### Prompt 3, The UML as a Data Contract

Before writing the `init.sql` or any database query, the generation and validation of the complete entity-relationship diagram was requested. This diagram was also reviewed with Gemini, who had participated in the requirements phase. The cardinalities, nullable fields, the integrity constraint guaranteeing that each interaction belongs to exactly one recipe source, and the separation between `updated_at` and `fecha_estado_receta` were all confirmed before moving forward.

This step avoided costly database migrations later because the schema was correct from the first `docker compose up`.

### Prompt 4, The README That Actually Needed Changes

At the end of the project, Claude considered the README complete and not requiring major modifications. That assessment was questioned: if during the process there had been specific Windows issues with WSL2, DNS errors in containers, the need for `.dockerignore` to avoid native binary incompatibilities, and confusion around the placeholder demo user hash, why was none of that documented?

The result was a README revision that included a known issues section for Windows, clear instructions for resetting the database, removal of the demo credentials that did not work, and a section on code formatting before each push. A README that does not reflect the real problems of a project is not useful to anyone trying to run it.

---

## 4. Critical Evaluation

### What Worked Well

The incremental methodology was the most successful decision of the project. By building step by step with explicit validation, each component was understood before being accepted. This meant that when deployment errors arrived, and many did, the codebase was solid and the problems were in the infrastructure layer, not in the business logic.

Using multiple AIs as complementary sources, not as definitive sources, was equally valuable. No AI was treated as the absolute truth. When Claude was wrong in diagnosing the blank page error, pointing to `hasMore` when the real problem was in the initialization of `pagination`, consulting other sources and investigating directly in DevTools was what unblocked the situation.

### What Was Most Difficult

Debugging Docker on Windows with WSL2 was consistently the most frustrating area. DNS problems, native binary incompatibilities, image cache that persisted even when told otherwise; none of these are visible in the code and required understanding how Docker works internally before being able to resolve them.

The Prettier CI process also generated more iterations than expected: the difference between the locally installed version and the one the CI installs with `^3.3.3` caused failures that took several commits to resolve. The solution was to pin the exact version without the `^` operator.

### Errors Introduced by the AIs That Were Corrected

**Dockerfile naming convention:** The files `Dockerfile.backend` and `Dockerfile.frontend` were named that way to facilitate downloading, but Docker expects to find a file named exactly `Dockerfile` in each folder. The error was not in the code but in the convention, and was identified when trying to run the project for the first time.

**The missing Nginx proxy block:** The original `nginx.conf` did not include the `location /api/` block to redirect requests to the backend. Without that configuration, Nginx returned the React `index.html` for all routes, including API calls, which meant the frontend never received real data.

**UUID validation in the recipe controller:** The backend attempted to look up MealDB IDs, simple numbers like `53085`, in PostgreSQL as if they were UUIDs. The database rejected the query with a type error before reaching the external API fallback. The fix was to add a UUID format validation before querying the local database.

**Missing columns in `user_recipes_interaction`:** To display the title, image, and category of MealDB recipes in the user's To-Do list, three columns needed to be added to the database schema and both the backend and frontend modified to store and retrieve that information. This adjustment was not in the original design because the spec assumed MealDB data could be retrieved in real time, which is true for a single recipe detail, but not efficient for a list.

### The Work Pattern That Defines the Process

What characterized this process was not delegating to the AI; it was using the AI as a technical interlocutor while maintaining control over the decisions. Every time a tool proposed something, the natural response was to ask why before accepting it. When something failed, the first reaction was to investigate before asking. When an AI was wrong, the solution was to seek another perspective rather than insisting with the same tool.

That cycle, proposal, questioning, validation, application, is what distinguishes using AI from depending on AI.

---

## 5. What You Learned

**Docker and containerization in practice:** Before this project, Docker was a concept. After it, it is a workflow. Understanding the difference between an image and a container, why `docker compose down -v` is different from `docker compose down`, why `npm ci` requires a `package-lock.json`, and why binaries compiled on Windows cannot run inside a Linux Alpine container; none of that came from documentation, it came from errors that had to be diagnosed and resolved in a real environment.

**DNS resolution inside containers:** On Windows with WSL2, Docker containers do not automatically inherit the host machine's DNS configuration. This means a container can be running perfectly while being completely unable to reach the internet. The solution, adding explicit DNS servers to `docker-compose.yml`, is not something that appears until your backend can fetch data locally but returns empty results in production.

**How Nginx works as a reverse proxy:** The original assumption was that Nginx only served static files. In practice, it also needs to know which requests to forward to the backend; and without the `location /api/` block, every API call silently returns the React `index.html` with a `200 OK` status, making it nearly impossible to diagnose from the frontend alone.

**Version pinning in CI environments:** The `^` operator in `package.json` means "install any compatible version from this one onwards." In practice, this means your local environment and the CI environment can silently install different versions of the same tool, producing different results for the exact same code. Pinning exact versions, removing the `^`, is a small change with significant consequences for reproducibility.

---

## 6. Project Status and Pending Work

FoodDiary was not completed in its entirety within the available timeframe. The core platform is functional: users can register, browse recipes from both the local database and TheMealDB, add recipes to a personal To-Do list, complete them through the decision modal, and build a Virtual Cookbook. The backend API, database schema, CI pipeline, and Docker infrastructure are fully operational.

However, one significant feature remains unimplemented: the recipe creation flow. The backend endpoint `POST /api/recipes` exists and is fully functional, including authorship validation and ingredient management, but no frontend interface was built to expose it. Users currently have no way to publish their own recipes to the community through the UI. A `CreateRecipe.tsx` page with its form, route, and navigation entry point were identified as the next step but were not reached before submission.

We hope that the depth of the architecture, the quality of the implemented features, the test coverage, the CI pipeline, and the documented development process demonstrate enough technical maturity to be considered eligible despite the incomplete state of the project. It is our genuine intention to finish the platform, and the foundation that has been built makes that a straightforward next step rather than a rebuild.

As a professional direction, this project reinforced a clear focus toward infrastructure engineering and frontend development, both areas where I want to specialize. The backend was approached with care and intention, but those two disciplines are where my genuine interest lies.

---

## Appendix, Project Structure and Architecture Reference

The complete final architecture of the project, including all files generated across the six development steps, is documented in the repository. The interactive entity-relationship diagram showing the full database schema, tables, relationships, cardinalities, and field constraints, is available as a standalone HTML file in the public repository at `fooddiary/docs/erd.html`.

```
fooddiary/
├── .github/workflows/ci.yml
├── .prettierrc
├── .gitignore
├── .env.example
├── docker-compose.yml
├── README.md
├── Agentic.md
│
├── database/
│   └── init.sql
│
├── backend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── vitest.config.js
│   └── src/
│       ├── index.js
│       ├── config/db.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── errorHandler.js
│       ├── services/mealdb.service.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── recipes.controller.js
│       │   └── interaction.controller.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── recipes.routes.js
│       │   └── interaction.routes.js
│       └── tests/
│           ├── auth.test.js
│           └── recipes.test.js
│
└── frontend/
    ├── .dockerignore
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── i18n.ts
        ├── index.css
        ├── global.d.ts
        ├── types/index.ts
        ├── lib/api.ts
        ├── context/AuthContext.tsx
        ├── routes/ProtectedRoute.tsx
        ├── hooks/
        │   ├── useRecipeCalculator.ts
        │   └── useRecipeCalculator.test.ts
        ├── assets/locales/
        │   ├── en.json
        │   └── es.json
        ├── components/
        │   ├── Navbar.tsx
        │   ├── RecipeCard.tsx
        │   ├── CategoryCarousel.tsx
        │   ├── SkeletonCard.tsx
        │   ├── CookModal.tsx
        │   └── PaginationControls.tsx
        └── pages/
            ├── Home.tsx
            ├── Login.tsx
            ├── Register.tsx
            ├── RecipeDetail.tsx
            ├── MyTodoList.tsx
            └── MyCookbook.tsx
```
