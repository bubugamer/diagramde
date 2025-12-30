# LLM 迭代需求（DeepSeek 接入版）

目标：在现有 Mermaid / PlantUML 版本感知的渲染对比工具中，增加大模型生成/修复图文本的能力，并保证生成文本符合所选版本的语法约束。

## 范围与用户故事
- 生成：输入自然语言描述，选择图类型与版本，模型返回对应版本的 Mermaid/PlantUML 文本与预览。
- 修复/适配：粘贴现有文本，选择版本，模型返回修复或适配该版本语法的文本。
- 转换：在 Mermaid/PlantUML 之间或版本之间转换，适配目标版本语法。
- 对比：可对同一文本在版本 A/B 下渲染对比。
- Snapshot：导出/导入时包含 LLM 相关信息（prompt、intent、diagramType、versions、generatedText）。

## DeepSeek 接入
- 首批模型：使用 DeepSeek API（需从环境变量读取 ENDPOINT / API_KEY）。
- LLM 请求封装：`{ prompt, intent, diagramType, targetVersions, existingText? }` → `generatedText`。
- 超时与错误：UI 显示 “LLM: generating/error”，错误信息区分 LLM 失败与渲染失败。

## 版本语法系统提示词
- 在调用 LLM 前，根据所选 diagramType + version 生成系统提示词，明确可用语法/差异，指导模型输出符合该版本。
- Mermaid 示例：列出版本号，提醒使用标准 flowchart/sequence 语法，避免较新/较旧特性（如 10.x 才支持的语法）。
- PlantUML 示例：列出版本号，强调必须包含 `@startuml`/`@enduml`，以及版本特定约束（如泳道定义顺序）。
- 系统提示词作为 system message 注入，用户输入作为 user message，必要时附上 existingText 作为 context。

## UI/UX 要点
- 新 LLM 面板：Intent 下拉（Generate/Refine/Convert），Diagram Type，Version A/B 选择，Prompt 输入框，Existing Text 可选（默认取编辑器内容），“Ask LLM” 按钮，状态提示，简短历史（最近 5 条，可 Apply）。
- Editor：承载当前文本，LLM 输出有 “Apply to Editor”。
- 渲染：Render A/B 按钮沿用现有逻辑；Compare 模式并排显示成功/错误。
- Snapshot：包含 LLM prompt/intent/generatedText/versions，导入时可恢复。

## 非功能
- 不硬编码密钥；使用环境变量配置 DeepSeek 端点和 key。
- 基础节流/防抖防止频繁请求；前端请求超时（如 15s）。
- 错误透明：LLM 错误与渲染错误分开显示。

## 暂不实现
- 多轮对话记忆（仅局部历史）。
- 模型切换 UI（固定 DeepSeek 模型）。
- 自动对比 diff/patch（由用户手动应用）。
