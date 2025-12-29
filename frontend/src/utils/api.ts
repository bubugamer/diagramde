import type { PlantUmlRenderRequest, PlantUmlRenderResponse } from '@/types'

const baseUrl = (import.meta.env.VITE_BACKEND_URL as string | undefined) || 'http://localhost:8787'

export async function renderPlantUml(body: PlantUmlRenderRequest): Promise<PlantUmlRenderResponse> {
  const res = await fetch(`${baseUrl}/render/plantuml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return { svg: null, error: { type: 'runtime', message: `HTTP ${res.status}`, raw: text } }
  }

  const data = (await res.json()) as PlantUmlRenderResponse
  return data
}
