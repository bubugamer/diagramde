export async function loadMermaid(version: string): Promise<any> {
  try {
    // Prefer versioned ESM builds placed under public/mermaid/<version>/mermaid.esm.js
    const module = await import(/* @vite-ignore */ `/mermaid/${version}/mermaid.esm.js`)
    return module.default ?? module
  } catch (err) {
    console.warn(`Falling back to bundled mermaid because version ${version} was not found`, err)
    const module = await import('mermaid')
    return module.default ?? module
  }
}

export async function renderMermaid(diagramId: string, source: string, version: string) {
  const mermaid: any = await loadMermaid(version)
  mermaid.initialize({ startOnLoad: false })
  const maybePromise = mermaid.render(diagramId, source)

  // Mermaid >=10 returns a Promise<{ svg }>
  if (maybePromise && typeof maybePromise.then === 'function') {
    const { svg } = await maybePromise
    return svg as string
  }

  // Mermaid 8.x uses callback signature
  return await new Promise<string>((resolve, reject) => {
    try {
      mermaid.render(diagramId, source, (svg: string) => resolve(svg))
    } catch (err) {
      reject(err)
    }
  })
}
