import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { compileConfig } from '../src/router-import.ts'

const execFileAsync = promisify(execFile)
const root = resolve(import.meta.dirname, '../..')

export type SmokeLevel = 'not_executable' | 'python_parse'

export interface CatalogMethod {
  id: string
  executable: boolean
}

export interface SmokeRow {
  methodId: string
  level: SmokeLevel
  ran: boolean
}

export interface SmokeResult {
  gpuRequired: false
  executableFailures: number
  rows: SmokeRow[]
}

export interface SmokeMatrix {
  gpuRequired: boolean
  methods: Array<{ id: string; level: SmokeLevel }>
}

export interface CheckConfigsOptions {
  methods?: readonly CatalogMethod[]
  write?: boolean
}

export function requiredSmokeLevel(method: { executable: boolean }): SmokeLevel {
  return method.executable ? 'python_parse' : 'not_executable'
}

export async function pythonParseCompiled(artifacts: { pythonSnippet: string; filenames: { python: string } }) {
  const directory = await mkdtemp(resolve(tmpdir(), 'scportal-config-smoke-'))
  const output = resolve(directory, artifacts.filenames.python)
  try {
    await writeFile(output, artifacts.pythonSnippet)
    await execFileAsync('python3', ['-m', 'py_compile', output], { encoding: 'utf8' })
  } catch (error) {
    const failure = error && typeof error === 'object' ? error as { stderr?: string; message?: string } : {}
    throw new Error(`python3 -m py_compile failed: ${failure.stderr?.trim() || failure.message || (error instanceof Error ? error.message : String(error))}`, { cause: error })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function readJson<T>(relative: string): Promise<T> {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8')) as T
}

function assertMatrixMatchesCatalog(matrix: SmokeMatrix, methods: readonly CatalogMethod[]) {
  if (matrix.gpuRequired !== false) throw new Error('config smoke must never require GPU')
  const catalogIds = methods.map((method) => method.id)
  const matrixIds = matrix.methods.map((row) => row.id)
  if (matrixIds.length !== catalogIds.length || new Set(matrixIds).size !== matrixIds.length) {
    throw new Error('smoke matrix must list every catalog method exactly once')
  }
  for (let index = 0; index < catalogIds.length; index += 1) {
    if (matrixIds[index] !== catalogIds[index]) throw new Error('smoke matrix method order must match the catalog')
    if (matrix.methods[index].level !== requiredSmokeLevel(methods[index])) {
      throw new Error(`smoke matrix level for ${catalogIds[index]} does not match the catalog executable flag`)
    }
  }
}

async function meetPythonParse(method: CatalogMethod): Promise<boolean> {
  try {
    const artifacts = compileConfig({
      outcome: {
        status: 'OK',
        seed: 20260823,
        evidenceVersion: 'router-evidence-synthetic-v1',
        routerVersion: 'router-core-v1',
        recommendations: [{
          methodId: method.id,
          roles: ['best_fit'],
          paretoLayer: 0,
          outrankingFlow: 0,
          conservativeUtility: 0,
          confidence: 'low',
          topThreeRetention: 1,
          effectiveDatasets: 1,
          criticalCoverage: 1,
          positiveEvidence: ['config-smoke'],
          positiveEvidenceDetails: [{
            text: 'config-smoke',
            group: 'latent_geometry',
            score: 0.8,
            baseline: 0.5,
            contribution: 0.3,
            direction: 'supports',
            metricIds: ['intrinsic_geometry'],
            datasetIds: ['synthetic_linear_small'],
            synthetic: true,
          }],
          evidenceLinks: [{
            paperId: 'config-smoke',
            locator: 'table:1',
            datasetId: 'synthetic_linear_small',
            metricId: 'intrinsic_geometry',
            datasetVersion: '1',
            methodVersion: '1.0.0',
            runConfigId: 'config-smoke',
            extractedAt: '2026-08-25T00:00:00Z',
            synthetic: true,
          }],
          confidenceReasons: ['config-smoke'],
          limitations: [],
          alternativeDispositions: [],
          excludedAlternatives: [],
        }],
        receipt: {
          profileFingerprint: '0'.repeat(64),
          release: {
            id: 'router-evidence-synthetic-v1',
            synthetic: true,
            description: 'config-smoke',
            configDigest: 'c'.repeat(64),
            evidenceDigest: 'd'.repeat(64),
          },
        },
      },
      profile: {
        id: 'quick_trajectory',
        modality: 'scrna',
        scale: '10k_50k',
        goals: ['trajectory_reconstruction'],
        topology: 'bifurcating',
        priors: { time: true },
        perturbation: false,
        weights: {
          latent_geometry: 0.2,
          continuity: 0.25,
          trajectory: 0.3,
          stability: 0.1,
          biology: 0.1,
          resources: 0.05,
        },
        maxResourceTier: 2,
        minEffectiveDatasets: 2,
        minCriticalCoverage: 0.6,
        seed: 20260823,
      },
      generatedAt: '2026-08-25T00:00:00.000Z',
    })
    await pythonParseCompiled(artifacts)
    return true
  } catch {
    return false
  }
}

export async function checkConfigs(options: CheckConfigsOptions = {}): Promise<SmokeResult> {
  const committed = await readJson<CatalogMethod[]>('data/router/methods.json')
  const matrix = await readJson<SmokeMatrix>('validation/config-smoke/matrix.json')
  assertMatrixMatchesCatalog(matrix, committed)
  const methods = options.methods ?? committed
  const rows: SmokeRow[] = []
  let executableFailures = 0
  for (const method of methods) {
    const level = requiredSmokeLevel(method)
    if (level === 'not_executable') {
      rows.push({ methodId: method.id, level, ran: false })
      continue
    }
    const passed = await meetPythonParse(method)
    rows.push({ methodId: method.id, level, ran: true })
    if (!passed) executableFailures += 1
  }
  const result: SmokeResult = { gpuRequired: false, executableFailures, rows }
  if (options.write !== false) {
    const directory = resolve(root, 'validation/results')
    await mkdir(directory, { recursive: true })
    await writeFile(resolve(directory, 'config-smoke.json'), `${JSON.stringify(result, null, 2)}\n`)
  }
  return result
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  const result = await checkConfigs()
  if (result.executableFailures > 0) process.exitCode = 1
}
