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

export interface SnapshotTarget {
  version: string
  options?: Record<string, unknown>
}

export interface Snapshot {
  diagramType: DiagramType
  source: string
  targets: SnapshotTarget[]
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
