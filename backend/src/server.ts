import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import { renderPlantUml } from './plantuml.js'
import type { RenderResponse } from './types.js'

const app = Fastify({ logger: true })
app.register(cors, { origin: '*' })

const RenderSchema = z.object({
  version: z.string(),
  source: z.string(),
  options: z.object({ format: z.enum(['svg', 'png']).optional() }).optional(),
})

type RenderBody = z.infer<typeof RenderSchema>

app.get('/health', async () => ({ status: 'ok' }))

app.post('/render/plantuml', async (req, reply) => {
  const parse = RenderSchema.safeParse(req.body)
  if (!parse.success) {
    reply.code(400)
    return { svg: null, error: { type: 'runtime', message: 'Invalid payload', raw: parse.error.message } }
  }

  const body: RenderBody = parse.data
  const result: RenderResponse = await renderPlantUml({
    version: body.version,
    source: body.source,
    format: body.options?.format ?? 'svg',
  })

  if (result.error) {
    reply.code(500)
  }
  return result
})

const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
app.listen({ port, host }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
