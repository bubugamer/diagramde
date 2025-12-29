import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { RenderResponse } from './types.js'

const execFileAsync = promisify(execFile)

export interface PlantUmlRequest {
  version: string
  source: string
  format?: 'svg' | 'png'
}

async function jarPath(version: string) {
  return path.join(process.cwd(), 'versions', version, 'plantuml.jar')
}

export async function renderPlantUml({ version, source, format = 'svg' }: PlantUmlRequest): Promise<RenderResponse> {
  const jar = await jarPath(version)
  const exists = await fs
    .access(jar)
    .then(() => true)
    .catch(() => false)

  if (!exists) {
    return {
      svg: null,
      error: {
        type: 'runtime',
        message: `PlantUML jar for version ${version} not found in versions/${version}`,
        raw: jar,
      },
    }
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plantuml-'))
  const inputPath = path.join(tmpDir, 'input.puml')
  const outputPath = path.join(tmpDir, `${path.basename(inputPath, path.extname(inputPath))}.${format}`)
  await fs.writeFile(inputPath, source, 'utf8')

  const javaArgs = [
    '-Xmx256m',
    '-Djava.awt.headless=true',
    '-jar',
    jar,
    `-t${format}`,
    inputPath,
    '-o',
    tmpDir,
  ]

  try {
    await execFileAsync('java', javaArgs, { timeout: 5000, maxBuffer: 10 * 1024 * 1024, cwd: tmpDir })
    const svg = await fs.readFile(outputPath, 'utf8')
    return { svg, error: null }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message === 'spawn java ENOENT'
          ? 'java executable not found on PATH'
          : err.message
        : 'PlantUML execution failed'
    return {
      svg: null,
      error: { type: 'runtime', message, raw: String(err) },
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}
