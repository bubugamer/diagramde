<template>
  <div class="page">
    <header class="topbar">
      <div>
        <h1>Diagram Debugger</h1>
        <p class="subtitle">Version-aware renderer for Mermaid and PlantUML</p>
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

    <section class="controls">
      <div class="field">
        <label>Diagram Type</label>
        <select v-model="diagramType">
          <option value="mermaid">Mermaid</option>
          <option value="plantuml">PlantUML</option>
        </select>
      </div>

      <div class="field">
        <label>Version A</label>
        <select v-model="leftVersion">
          <option v-for="v in currentVersions" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>

      <div class="field" v-if="mode === 'compare'">
        <label>Version B</label>
        <select v-model="rightVersion">
          <option v-for="v in currentVersions" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>

      <div class="field grow">
        <label>Render Options</label>
        <div class="buttons">
          <button @click="renderLeft" :disabled="rendering">Render A</button>
          <button v-if="mode === 'compare'" @click="renderRight" :disabled="rendering">Render B</button>
        </div>
      </div>
    </section>

    <section class="editor">
      <label>Source</label>
      <textarea v-model="source" rows="10" spellcheck="false"></textarea>
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
import type { DiagramType, RenderResult, Snapshot } from './types'

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

const currentVersions = computed(() =>
  diagramType.value === 'mermaid' ? MERMAID_VERSIONS : PLANTUML_VERSIONS,
)

const diagramTypeLabel = computed(() => (diagramType.value === 'mermaid' ? 'Mermaid' : 'PlantUML'))
const modeLabel = computed(() => (mode.value === 'single' ? 'Single' : 'Compare'))

function formatError(err?: { type: string; message: string; raw: string }) {
  if (!err) return ''
  return `[${err.type}] ${err.message}\n${err.raw}`
}

function toggleMode() {
  mode.value = mode.value === 'single' ? 'compare' : 'single'
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
      const renderId = `${key}-${safeVersion}-${Date.now()}` // avoid dots breaking querySelector
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
  }
}
</script>

<style scoped>
.page {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1f2933;
  background: linear-gradient(135deg, #f5f7fb, #eef2ff);
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
}

.subtitle {
  margin: 4px 0 0;
  color: #52606d;
}

.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.actions button,
.import {
  background: #1f7aec;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 600;
}

.import input {
  display: none;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: white;
  border: 1px solid #dfe3eb;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 8px 30px rgba(31, 122, 236, 0.05);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  color: #52606d;
}

.field select,
.field textarea,
.field input,
.field button {
  font-size: 14px;
}

.grow {
  flex: 1;
}

.buttons {
  display: flex;
  gap: 8px;
}

.editor textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #dfe3eb;
  padding: 12px;
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  background: #ffffff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
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

.panel {
  background: white;
  border: 1px solid #dfe3eb;
  border-radius: 10px;
  padding: 12px;
  min-height: 240px;
  box-shadow: 0 8px 30px rgba(31, 122, 236, 0.05);
}

.panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.render svg {
  width: 100%;
}

.placeholder {
  color: #8695a6;
  font-style: italic;
}

.chip {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  color: #52606d;
  font-size: 12px;
}

.chip.success {
  background: #e8f9f0;
  color: #1f7a4d;
}

.chip.error {
  background: #ffe8e6;
  color: #c23030;
}

.error-box {
  background: #fff5f5;
  color: #b42318;
  border-radius: 8px;
  padding: 8px;
  white-space: pre-wrap;
  border: 1px solid #ffd3cf;
  font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
</style>
