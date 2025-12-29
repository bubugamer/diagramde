# Repository Guidelines

## Project Structure & Module Organization
- Planned layout: `frontend/` (Vite + Vue UI with Monaco/CodeMirror), `backend/` (PlantUML renderer service with per-version jars and `render.sh`), `assets/mermaid/<version>/` (bundled mermaid ESM builds), `docs/` (PRD and design docs). Keep Snapshot examples in `examples/` for easy reproduction.
- Keep versioned dependencies under `backend/versions/` and `frontend/public/mermaid/` to allow side-by-side loading; avoid global installs that break reproducibility.

## Build, Test, and Development Commands
- Frontend: `cd frontend && npm install` then `npm run dev` for local UI, `npm run build` for production assets, `npm run lint` to enforce style.
- Backend: `cd backend && npm install` (or set up virtualenv if Python) then `npm test`/`pnpm test` for service logic; `./render.sh --version 1.2023.10 --input sample.puml` to dry-run PlantUML rendering with resource limits.
- Env: set `VITE_BACKEND_URL` for the frontend to point at the Fastify service (default `http://localhost:8787`).
- End-to-end (once wired): `npm run e2e` from repo root to validate mermaid/plantuml flows against multiple versions.

## Coding Style & Naming Conventions
- JavaScript/TypeScript/Vue: 2-space indent, single quotes, trailing commas where valid; keep components in `PascalCase.vue`, composables in `useX.ts`.
- Prefer functional, typed APIs; normalize render errors to `{ type, message, raw }` before returning.
- Shell scripts: `set -euo pipefail`; keep renderer scripts idempotent and version-parameterized.
- Lint/format with ESLint + Prettier; commit after a clean run of `npm run lint`.

## Testing Guidelines
- Unit: cover mermaid loader isolation, error normalization, snapshot import/export, and backend option parsing; target ≥80% critical-path coverage.
- Snapshot fixtures: store under `examples/snapshots/` with readable names like `mermaid-9.4.3-seq.json`.
- E2E: compare render outputs for version A/B; assert both success and failure paths (parse/render/runtime).
- Name tests by feature and version, e.g., `render.spec.ts`, `snapshot.v9.test.ts`.

## Commit & Pull Request Guidelines
- Commit style: project history is minimal; use Conventional Commits (`feat:`, `fix:`, `chore:`) to keep changelog-ready history.
- PRs should link issues, describe user-facing changes, list tested commands, and attach screenshots/SVGs for UI or render-impacting work.
- For backend changes, note resource limits and any new jar versions; for frontend, mention mermaid versions touched and snapshot schema adjustments.

## Security & Configuration Tips
- Disable network access in renderer processes; enforce time/memory limits (`timeout`, `-Xmx`) and restrict includes to local allowlists.
- Keep bundled mermaid/PlantUML versions checked in with hashes; avoid fetching from CDNs at runtime.
- Ensure snapshots redact secrets and always record `diagramType` + `version` for reproducibility.
