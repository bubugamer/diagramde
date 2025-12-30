import type { DiagramType } from '@/types'

export function buildSystemPrompt(diagramType: DiagramType, versions: string[]): string {
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
