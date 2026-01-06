# Diagram Debugger（版本敏感的渲染与对比工具）

支持 Mermaid 与 PlantUML 的多版本渲染、并排对比，并通过 Snapshot 保障问题可复现。

## 特性
- Mermaid 多版本共存对比（已内置 10.6.0 / 9.4.3 / 8.4.8）。
- PlantUML 后端渲染，按版本切换（已内置 1.2023.10 / 1.2022.7）。
- 单列/对比模式切换，导出/导入 Snapshot，错误分类（parse/render/runtime）。

## 目录结构
- `frontend/` — Vite + Vue 3 前端，Mermaid 版本包在 `public/mermaid/<version>/`。
- `backend/` — Fastify 服务，`POST /render/plantuml`；Jar 放在 `versions/<version>/plantuml.jar`。
- `examples/snapshots/` — 示例 Snapshot（Mermaid/PlantUML）。
- 文档：`docs/`、`AGENTS.md`、PRD/DDD。

## 环境需求
- Node.js 18+（前后端）。
- Java 运行时（PlantUML 渲染）。
- LLM（DeepSeek）端点与密钥通过环境变量配置。

## 快速启动
```bash
# 后端
cd backend
npm install
npm run build
export LLM_ENDPOINT=https://api.deepseek.com/v1/chat/completions
export LLM_API_KEY=sk-xxxx
PINO_PRETTY=true PINO_LOG_LEVEL=debug HOST=127.0.0.1 PORT=8787 node dist/server.js

# 前端（另一个终端）
cd frontend
npm install
VITE_BACKEND_URL=http://127.0.0.1:8787 npm run dev -- --host 127.0.0.1 --port 5173 --clearScreen false
```

## 使用
- 在界面选择 Diagram 类型和版本，点击 Render A/B。
- Compare 模式可对比两个版本的渲染结果与错误。
- Export Snapshot：下载 JSON，包含 diagramType/source/versions。
- Import Snapshot：恢复编辑器内容和版本选择，保证复现。

## 添加新版本
- Mermaid：将 ESM 包放到 `frontend/public/mermaid/<version>/mermaid.esm.js`（8.x 用 ESM shim 加载 `mermaid.min.js`）。
- PlantUML：下载 jar 到 `backend/versions/<version>/plantuml.jar`（参考 `backend/versions/README.md`）。

## 后端 API
- `GET /health` → `{ status: "ok" }`
- `POST /render/plantuml`
  
  ```json
  { "version": "1.2023.10", "source": "@startuml ... @enduml", "options": { "format": "svg" } }
  ```
  响应：成功返回 SVG，失败返回 `{ error: { type, message, raw } }`
