# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js application with mixed routing (`app/` and legacy `pages/`). Reusable UI lives in `components/`, shared logic/utilities in `lib/`, and type definitions in `types/`. Database schema and client generation assets are in `prisma/`. Static assets go in `public/`. Utility and maintenance scripts (for data reset/verification) are in `scripts/`. Local/generated runtime data may appear in `storage/` and should be treated carefully.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js in development mode.
- `npm run build`: Create a production build.
- `npm run start`: Start the app with `server.js` (custom server entry).
- `npm run start:next`: Start with standard `next start`.
- `npm run lint`: Run ESLint (Next.js core-web-vitals + TypeScript config).
- `npm run test`: Run Vitest unit tests.
- `npm run test:ui`: Open Vitest UI.
- `npm run test:coverage`: Run tests with V8 coverage (`text/json/html` reports).
- `npm run db:reset` / `npm run db:verify`: Run repository scripts in `scripts/` via `tsx`.

## Coding Style & Naming Conventions
Use TypeScript for new code. Follow existing style in each file (quotes/semicolons vary slightly across configs and app code). Prefer:
- `PascalCase` for React components (`components/EmptyState.tsx`)
- `camelCase` for functions/variables
- `kebab-case` for route segments and script filenames where applicable

Use the `@/` alias for root imports when it improves readability. Run `npm run lint` before opening a PR.

## Testing Guidelines
Vitest is configured with `jsdom` and `@testing-library/jest-dom` (`vitest.setup.ts`). Test files should be named `*.test.ts` or `*.test.tsx`; current unit tests are mostly in `lib/` (for example, `lib/logger.test.ts`). Add tests for touched parsing, schema, and utility logic. No coverage threshold is enforced, but `npm run test:coverage` should remain clean for changed areas.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes: `feat:`, `fix:`, `refactor:`, `perf:`, `test:`. Keep messages short and scoped (Spanish or English is fine if consistent). For PRs, include:
- A brief summary of behavior changes
- Linked issue/task ID (if available)
- Test evidence (`npm run test`, `npm run lint`)
- Screenshots/videos for UI changes

## Security & Configuration Tips
Do not commit real secrets from `.env`. Use `.env.production.example` as a template for required variables. Review data-reset scripts before running them against shared environments.
