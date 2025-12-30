import type { LlmRequest, LlmResponse } from '@/types'
import { buildSystemPrompt } from './systemPrompt'

const endpoint = (import.meta.env.VITE_LLM_ENDPOINT as string | undefined) || ''
const apiKey = (import.meta.env.VITE_LLM_API_KEY as string | undefined) || ''

export async function callLlm(request: LlmRequest): Promise<LlmResponse> {
  if (!endpoint) {
    throw new Error('LLM endpoint not configured (set VITE_LLM_ENDPOINT)')
  }
  const system = buildSystemPrompt(request.diagramType, request.versions)
  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: buildUserContent(request) },
    ],
    stream: false,
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LLM HTTP ${res.status}: ${text}`)
  }
  const data = await res.json()
  const generatedText = extractText(data)
  if (!generatedText) {
    throw new Error('LLM returned empty content')
  }
  return { generatedText }
}

function buildUserContent(req: LlmRequest): string {
  const parts = [`Intent: ${req.intent}`, `DiagramType: ${req.diagramType}`, `Versions: ${req.versions.join(', ')}`, `Prompt: ${req.prompt}`]
  if (req.existingText) parts.push(`Existing:\n${req.existingText}`)
  return parts.join('\n')
}

function extractText(apiResponse: any): string | null {
  // Expecting OpenAI/DeepSeek style response with choices[0].message.content
  const content: string | undefined = apiResponse?.choices?.[0]?.message?.content
  if (!content) return null
  // try to extract from code fence
  const match = content.match(/```[a-zA-Z]*\\n([\\s\\S]*?)```/)
  if (match) return match[1].trim()
  return content.trim()
}
