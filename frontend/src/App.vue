<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1>Diagram Debugger</h1>
        <p class="subtitle">LLM-assisted, version-aware Mermaid and PlantUML</p>
      </div>
      <div class="actions">
        <button @click="toggleMode">Mode: {{ modeLabel }}</button>
        <button @click="exportSnapshot">Export Snapshot</button>
        <label class="import">
          Import Snapshot
          <input type="file" accept="application/json" @change="onImport" />
        </label>
      </div>
    </header>

    <section class="panel">
      <div class="section-title">LLM Panel</div>
      <div class="grid">
        <div class="stack">
          <div class="row">
            <div>
              <label>Intent</label><br />
              <select v-model="llmIntent">
                <option value="generate">Generate</option>
                <option value="refine">Refine</option>
                <option value="convert">Convert</option>
              </select>
            </div>
            <div>
              <label>Diagram Type</label><br />
              <select v-model="diagramType">
                <option value="mermaid">Mermaid</option>
                <option value="plantuml">PlantUML</option>
              </select>
            </div>
            <div>
              <label>Version A</label><br />
              <select v-model="leftVersion">
                <option v-for="v in currentVersions" :key="v" :value="v">{{ v }}</option>
              </select>
            </div>
            <div v-if="mode === 'compare'">
              <label>Version B</label><br />
              <select v-model="rightVersion">
                <option v-for="v in currentVersions" :key="v" :value="v">{{ v }}</option>
              </select>
            </div>
          </div>
          <div>
            <label>Prompt</label>
            <textarea v-model="llmPrompt" placeholder="Describe the diagram or ask for fixes..."></textarea>
          </div>
          <div>
            <div class="row space-between">
              <label>Existing Text (Refine/Convert) — defaults to editor</label>
              <div class="row" style="gap: 4px;">
                <input type="checkbox" id="use-editor" v-model="useEditorText" />
                <label for="use-editor">Use editor text</label>
              </div>
            </div>
            <textarea v-model="llmExistingText" placeholder="@startuml ..."></textarea>
          </div>
          <div class="llm-footer">
            <div class="llm-actions">
              <button class="primary" :disabled="llmStatus === 'loading'" @click="askLlm">Ask LLM</button>
              <span
                class="chip"
                :class="{
                  pending: llmStatus === 'loading',
                  success: llmStatus === 'success',
                  error: llmStatus === 'error',
                }"
              >
                LLM: {{ llmStatusMessage }}
              </span>
            </div>
            <div class="row" style="gap: 6px;">
              <label>History</label>
              <span class="chip">last 5</span>
            </div>
          </div>
        </div>

        <div class="stack">
          <div class="history">
            <div v-for="(item, idx) in history" :key="idx" class="history-item">
              <span>{{ item.intent }}: {{ item.prompt }}</span>
              <button @click="applyHistory(item)">Apply</button>
            </div>
          </div>
          <div>
            <label>LLM Output (preview)</label>
            <textarea v-model="llmOutput" placeholder="```mermaid\nflowchart TD\n...\n```"></textarea>
            <div class="llm-actions" style="margin-top: 8px;">
              <button class="primary" :disabled="!llmOutput" @click="applyLlmOutput">Apply to Editor</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel stack">
      <div class="section-title">Editor</div>
      <textarea class="editor-area" v-model="source" rows="10" spellcheck="false"></textarea>
      <div class="row" style="gap: 10px;">
        <button class="primary" @click="renderLeft" :disabled="rendering">Render A</button>
        <button v-if="mode === 'compare'" @click="renderRight" :disabled="rendering">Render B</button>
      </div>
    </section>

    <section class="panels" :class="{ compare: mode === 'compare' }">
      <div class="panel">
        <header>
          <h3>{{ diagramTypeLabel }} • {{ leftVersion }}</h3>
          <span v-if="left.status === 'loading'" class="chip">Rendering…</span>
          <span v-else-if="left.status === 'error'" class="chip error">Error</span>
          <span v-else-if="left.status === 'success'" class="chip success">OK</span>
        </header>
        <div class="render" v-html="left.svg" v-if="left.status === 'success'"></div>
        <pre v-else-if="left.error" class="error-box">{{ formatError(left.error) }}</pre>
        <p v-else class="placeholder">Render to view output.</p>
      </div>

      <div class="panel" v-if="mode === 'compare'">
        <header>
          <h3>{{ diagramTypeLabel }} • {{ rightVersion }}</h3>
          <span v-if="right.status === 'loading'" class="chip">Rendering…</span>
          <span v-else-if="right.status === 'error'" class="chip error">Error</span>
          <span v-else-if="right.status === 'success'" class="chip success">OK</span>
        </header>
        <div class="render" v-html="right.svg" v-if="right.status === 'success'"></div>
        <pre v-else-if="right.error" class="error-box">{{ formatError(right.error) }}</pre>
        <p v-else class="placeholder">Render to view output.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { renderMermaid } from './utils/mermaidLoader'
import { renderPlantUml } from './utils/api'
import { callLlm } from './utils/llm'
import type { DiagramType, LlmIntent, RenderResult, Snapshot } from './types'

const MERMAID_VERSIONS = ['10.6.0', '9.4.3', '8.4.8']
const PLANTUML_VERSIONS = ['1.2023.10', '1.2022.7']
const DEFAULT_SOURCE: Record<DiagramType, string> = {
  mermaid: `flowchart TD
  A[Render] --> B[Compare]
  B --> C[Snapshot]
`,
  plantuml: `@startuml
Alice -> Bob : hello
Bob --> Alice : ok
@enduml`,
}

const diagramType = ref<DiagramType>('mermaid')
const mode = ref<'single' | 'compare'>('single')
const leftVersion = ref(MERMAID_VERSIONS[0])
const rightVersion = ref(MERMAID_VERSIONS[1])
const rendering = ref(false)

const left = reactive<RenderResult>({ status: 'idle' })
const right = reactive<RenderResult>({ status: 'idle' })

const source = ref(DEFAULT_SOURCE.mermaid)

const llmIntent = ref<LlmIntent>('generate')
const llmPrompt = ref('')
const llmExistingText = ref('')
const useEditorText = ref(true)
const llmStatus = ref<'idle' | 'loading' | 'error' | 'success'>('idle')
const llmError = ref<string | null>(null)
const llmOutput = ref('')
const history = ref<{ prompt: string; intent: LlmIntent; output: string }[]>([])

const currentVersions = computed(() =>
  diagramType.value === 'mermaid' ? MERMAID_VERSIONS : PLANTUML_VERSIONS,
)

const diagramTypeLabel = computed(() => (diagramType.value === 'mermaid' ? 'Mermaid' : 'PlantUML'))
const modeLabel = computed(() => (mode.value === 'single' ? 'Single' : 'Compare'))
const llmStatusMessage = computed(() => {
  if (llmStatus.value === 'loading') return 'generating...'
  if (llmStatus.value === 'error') return llmError.value || 'error'
  if (llmStatus.value === 'success') return 'done'
  return 'idle'
})

function formatError(err?: { type: string; message: string; raw: string }) {
  if (!err) return ''
  return `[${err.type}] ${err.message}\n${err.raw}`
}

function toggleMode() {
  mode.value = mode.value === 'single' ? 'compare' : 'single'
}

async function renderLeft() {
  await renderTarget(left, leftVersion.value, 'left')
}

async function renderRight() {
  await renderTarget(right, rightVersion.value, 'right')
}

async function renderTarget(target: RenderResult, version: string, key: 'left' | 'right') {
  target.status = 'loading'
  target.error = undefined
  target.svg = undefined
  rendering.value = true
  try {
    if (diagramType.value === 'mermaid') {
      const safeVersion = version.replace(/[^a-zA-Z0-9_-]/g, '-')
      const renderId = `${key}-${safeVersion}-${Date.now()}`
      const svg = await renderMermaid(renderId, source.value, version)
      target.status = 'success'
      target.svg = svg
    } else {
      const result = await renderPlantUml({ version, source: source.value, options: { format: 'svg' } })
      if (result.error || !result.svg) {
        target.status = 'error'
        target.error = result.error ?? { type: 'runtime', message: 'Unknown PlantUML error', raw: '' }
      } else {
        target.status = 'success'
        target.svg = result.svg
      }
    }
  } catch (err) {
    console.error(err)
    target.status = 'error'
    target.error = {
      type: 'runtime',
      message: err instanceof Error ? err.message : 'Unknown render error',
      raw: String(err),
    }
  } finally {
    rendering.value = false
  }
}

async function askLlm() {
  llmStatus.value = 'loading'
  llmError.value = null
  const versions = mode.value === 'compare' ? [leftVersion.value, rightVersion.value] : [leftVersion.value]
  const existing = useEditorText.value ? source.value : llmExistingText.value
  try {
    const resp = await callLlm({
      prompt: llmPrompt.value,
      intent: llmIntent.value,
      diagramType: diagramType.value,
      versions,
      existingText: existing,
    })
    llmOutput.value = resp.generatedText
    history.value = [{ prompt: llmPrompt.value, intent: llmIntent.value, output: resp.generatedText }, ...history.value].slice(0, 5)
    llmStatus.value = 'success'
  } catch (err) {
    llmStatus.value = 'error'
    llmError.value = err instanceof Error ? err.message : String(err)
  }
}

function applyLlmOutput() {
  if (!llmOutput.value) return
  source.value = llmOutput.value
}

function applyHistory(item: { prompt: string; intent: LlmIntent; output: string }) {
  llmPrompt.value = item.prompt
  llmIntent.value = item.intent
  llmOutput.value = item.output
  source.value = item.output
}

function exportSnapshot() {
  const snapshot: Snapshot = {
    diagramType: diagramType.value,
    source: source.value,
    targets:
      mode.value === 'compare'
        ? [
            { version: leftVersion.value, options: {} },
            { version: rightVersion.value, options: {} },
          ]
        : [{ version: leftVersion.value, options: {} }],
    llm: {
      prompt: llmPrompt.value,
      intent: llmIntent.value,
      generatedText: llmOutput.value,
      versions: mode.value === 'compare' ? [leftVersion.value, rightVersion.value] : [leftVersion.value],
    },
  }

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `snapshot-${snapshot.diagramType}-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function onImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as Snapshot
      applySnapshot(parsed)
    } catch (err) {
      alert(`Invalid snapshot: ${err}`)
    }
  }
  reader.readAsText(file)
}

function applySnapshot(snapshot: Snapshot) {
  diagramType.value = snapshot.diagramType
  source.value = snapshot.source
  leftVersion.value = snapshot.targets[0]?.version ?? currentVersions.value[0]
  if (snapshot.targets[1]) {
    rightVersion.value = snapshot.targets[1].version
    mode.value = 'compare'
  } else {
    mode.value = 'single'
    Object.assign(right, { status: 'idle', svg: undefined, error: undefined })
  }
  if (snapshot.llm) {
    llmPrompt.value = snapshot.llm.prompt
    llmIntent.value = snapshot.llm.intent
    llmOutput.value = snapshot.llm.generatedText || ''
  }
}

watch(
  () => diagramType.value,
  (next) => {
    source.value = DEFAULT_SOURCE[next]
    const versions = next === 'mermaid' ? MERMAID_VERSIONS : PLANTUML_VERSIONS
    leftVersion.value = versions[0]
    rightVersion.value = versions[1] ?? versions[0]
  },
)
</script>

<style scoped>
:global(*, *::before, *::after) {
  box-sizing: border-box;
}

.page {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e5e7eb;
  background: radial-gradient(120% 120% at 20% 20%, #1e293b, #0b1221);
  min-height: 100vh;
  padding: 24px;
}

a {
  color: inherit;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.subtitle {
  margin: 4px 0 0;
  color: #9ca3af;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.actions button,
.import {
  background: linear-gradient(90deg, #22d3ee, #3b82f6);
  color: #0b1221;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 700;
}

.import input {
  display: none;
}

.panel {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
  margin-bottom: 12px;
}

.section-title {
  color: #9ca3af;
  font-size: 13px;
  letter-spacing: 0.4px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.3fr);
  gap: 12px;
  align-items: start;
  width: 100%;
}

.stack {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.row.space-between {
  justify-content: space-between;
}

label {
  font-size: 12px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

select,
textarea,
input,
button {
  background: #1f2937;
  color: #e5e7eb;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 10px;
  font-size: 14px;
}

button {
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

button.primary {
  background: linear-gradient(90deg, #22d3ee, #3b82f6);
  color: #0b1221;
  font-weight: 700;
}

button:hover {
  transform: translateY(-1px);
}

textarea {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  max-width: 100%;
}

.editor-area {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #1f2937;
  padding: 12px;
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  background: #0f172a;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.llm-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.llm-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.history {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.history-item {
  background: #1f2937;
  border: 1px solid #1f2937;
  border-radius: 10px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.history-item span {
  color: #9ca3af;
  font-size: 13px;
}

.panels {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 12px;
}

.panels.compare {
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 1200px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .panels.compare {
    grid-template-columns: 1fr;
  }
}

.render {
  background: #0f172a;
  border-radius: 10px;
  padding: 8px;
}

.render svg {
  width: 100%;
}

.placeholder {
  color: #9ca3af;
  font-style: italic;
}

.chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: #1f2937;
  border: 1px solid #1f2937;
  color: #9ca3af;
  font-size: 12px;
}

.chip.success {
  background: #16a34a;
  color: #0b1221;
}

.chip.error {
  background: #ef4444;
  color: #0b1221;
}

.chip.pending {
  background: #f59e0b;
  color: #0b1221;
}

.error-box {
  background: #7f1d1d;
  color: #fecdd3;
  border-radius: 8px;
  padding: 8px;
  white-space: pre-wrap;
  border: 1px solid #b91c1c;
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
