export type DiagramType = 'mermaid' | 'plantuml'

export type RenderStatus = 'idle' | 'success' | 'error' | 'loading'

export type RenderErrorType = 'parse' | 'render' | 'runtime'

export interface RenderError {
  type: RenderErrorType
  message: string
  raw: string
}

export interface RenderResult {
  status: RenderStatus
  svg?: string
  error?: RenderError
}

export type LlmIntent = 'generate' | 'refine' | 'convert'

export interface SnapshotTarget {
  version: string
  options?: Record<string, unknown>
}

export interface Snapshot {
  diagramType: DiagramType
  source: string
  targets: SnapshotTarget[]
  llm?: {
    prompt: string
    intent: LlmIntent
    generatedText?: string
    versions?: string[]
  }
}

export interface PlantUmlRenderRequest {
  version: string
  source: string
  options?: { format?: 'svg' | 'png' }
}

export interface PlantUmlRenderResponse {
  svg: string | null
  error: RenderError | null
}

export interface LlmRequest {
  prompt: string
  intent: LlmIntent
  diagramType: DiagramType
  versions: string[]
  existingText?: string
}

export interface LlmResponse {
  generatedText: string
  reasoning?: string
  warnings?: string
}
