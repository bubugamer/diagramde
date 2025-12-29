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
