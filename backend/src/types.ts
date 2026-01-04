export type RenderErrorType = 'parse' | 'render' | 'runtime'

export interface RenderError {
  type: RenderErrorType
  message: string
  raw: string
}

export interface RenderResponse {
  svg: string | null
  error: RenderError | null
}

export interface LlmRequestBody {
  prompt: string
  intent: 'generate' | 'refine' | 'convert'
  diagramType: 'mermaid' | 'plantuml'
  versions: string[]
  existingText?: string
}

export interface LlmResponseBody {
  generatedText: string | null
  error: string | null
}
