# Diagram Debugger

Version-aware renderer and comparator for Mermaid and PlantUML diagrams, with snapshot export/import for reproducible issues.

## Features
- Load multiple Mermaid versions side-by-side (10.6.0, 9.4.3, 8.4.8 bundled).
- Render PlantUML via a backend service with per-version jars (1.2023.10, 1.2022.7 bundled).
- Compare outputs between two versions, and export/import JSON snapshots for deterministic reproduction.
- Minimal UI with editor, single/compare mode, and error surface (parse/render/runtime).

## Project Structure
- `frontend/` — Vite + Vue 3 app; Mermaid loaders under `public/mermaid/<version>/`.
- `backend/` — Fastify service exposing `POST /render/plantuml`; PlantUML jars in `versions/<version>/plantuml.jar`.
- `examples/snapshots/` — Example Mermaid and PlantUML snapshot JSONs.
- `docs/`, `AGENTS.md`, PRD/DDD — requirements and contributor guidance.

## Prerequisites
- Node.js 18+ (for frontend/backend).
- Java runtime (for PlantUML rendering).
- LLM (DeepSeek) endpoint/key via environment variables.

## Setup
```bash
# Backend
cd backend
npm install
npm run build
# set DeepSeek creds on backend; see backend/.env.example
export LLM_ENDPOINT=https://api.deepseek.com/v1/chat/completions
export LLM_API_KEY=sk-xxxx
PINO_PRETTY=true PINO_LOG_LEVEL=debug HOST=127.0.0.1 PORT=8787 node dist/server.js

# Frontend (in another shell)
cd frontend
npm install
VITE_BACKEND_URL=http://127.0.0.1:8787 npm run dev -- --host 127.0.0.1 --port 5173 --clearScreen false
```

## Usage
- In the UI, pick `Mermaid` or `PlantUML`, adjust versions, and click Render A/B.
- Compare mode renders two versions side-by-side.
- Export Snapshot: downloads JSON capturing diagramType/source/versions.
- Import Snapshot: restores the editor, versions, and mode to reproduce.

## Adding Versions
- Mermaid: place ESM bundle at `frontend/public/mermaid/<version>/mermaid.esm.js` (for 8.x, an ESM shim loads `mermaid.min.js`).
- PlantUML: download jar to `backend/versions/<version>/plantuml.jar` (see `backend/versions/README.md`).

## API (backend)
- `GET /health` → `{ status: "ok" }`
- `POST /render/plantuml`
  ```json
  { "version": "1.2023.10", "source": "@startuml ... @enduml", "options": { "format": "svg" } }
  ```
  Response: `{ "svg": "<svg>...</svg>", "error": null }` or `{ "svg": null, "error": { "type": "...", "message": "...", "raw": "..." } }`
