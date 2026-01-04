import type { LlmRequestBody, LlmResponseBody } from './types.js'

const llmEndpoint = process.env.LLM_ENDPOINT || ''
const llmApiKey = process.env.LLM_API_KEY || ''
const llmModel = process.env.LLM_MODEL || 'deepseek-chat'
const llmTemperature = process.env.LLM_TEMPERATURE ? Number(process.env.LLM_TEMPERATURE) : 0.2

export async function callLlm(body: LlmRequestBody, log: (msg: any) => void): Promise<LlmResponseBody> {
  if (!llmEndpoint) {
    return { generatedText: null, error: 'LLM endpoint not configured (LLM_ENDPOINT)' }
  }
  const systemPrompt = buildSystemPrompt(body.diagramType, body.versions)

  const payload = {
    model: llmModel,
    temperature: llmTemperature,
    stream: false,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: buildUserContent(body),
      },
    ],
  }

  log({
    llm_request: {
      endpoint: llmEndpoint,
      model: llmModel,
      intent: body.intent,
      diagramType: body.diagramType,
      versions: body.versions,
      prompt_preview: truncate(body.prompt),
    },
  })

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (llmApiKey) headers.Authorization = `Bearer ${llmApiKey}`

  const res = await fetch(llmEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    log({ llm_error: `HTTP ${res.status}`, detail: truncate(text) })
    return { generatedText: null, error: `LLM HTTP ${res.status}` }
  }

  const data = await res.json()
  const generatedText = extractText(data)
  log({
    llm_response: {
      status: res.status,
      text_preview: truncate(generatedText ?? ''),
    },
  })

  if (!generatedText) {
    return { generatedText: null, error: 'LLM returned empty content' }
  }
  return { generatedText, error: null }
}

function buildUserContent(req: LlmRequestBody): string {
  const parts = [`Intent: ${req.intent}`, `DiagramType: ${req.diagramType}`, `Versions: ${req.versions.join(', ')}`, `Prompt: ${req.prompt}`]
  if (req.existingText) parts.push(`Existing:\n${req.existingText}`)
  return parts.join('\n')
}

function extractText(apiResponse: any): string | null {
  const content: string | undefined = apiResponse?.choices?.[0]?.message?.content
  if (!content) return null
  const match = content.match(/```[a-zA-Z]*\n([\s\S]*?)```/)
  if (match) return match[1].trim()
  return content.trim()
}

function truncate(text: string, max = 200): string {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function buildSystemPrompt(diagramType: string, versions: string[]): string {
  const versionList = versions.filter(Boolean).join(', ')
  const base = `You are a diagram generator. Output ONLY ${diagramType} code fenced in triple backticks. Target versions: ${versionList}. Keep output minimal and syntactically valid.`
  if (diagramType === 'mermaid') {
    return `${base}
- Use standard mermaid syntax for the specified versions (flowchart/sequence/class/gantt as requested).
- Avoid features not available in older mermaid versions; prefer flowchart TD/LR basics.
- Do not include commentary outside the code fence.`
  }
  return `${base}
- Use PlantUML with @startuml ... @enduml wrapping.
- Respect version-specific constraints (e.g., define swimlanes before use; avoid unsupported directives).
- Do not include commentary outside the code fence.`
}
