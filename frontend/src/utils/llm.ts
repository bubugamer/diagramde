import type { LlmRequest, LlmResponse } from '@/types'

const backendBase = (import.meta.env.VITE_BACKEND_URL as string | undefined) || ''

export async function callLlm(request: LlmRequest): Promise<LlmResponse> {
  if (!backendBase) {
    throw new Error('Backend URL not configured (set VITE_BACKEND_URL)')
  }
  const res = await fetch(`${backendBase}/llm/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM proxy HTTP ${res.status}: ${text}`)
  }
  const data = (await res.json()) as { generatedText: string | null; error: string | null }
  if (data.error) {
    throw new Error(data.error)
  }
  return { generatedText: data.generatedText ?? '' }
}
