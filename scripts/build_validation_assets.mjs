import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = resolve(root, 'public/router-evidence')
const resultsDirectory = resolve(root, 'validation/results')

const FORBIDDEN_EXTENSIONS = new Set(['.h5ad', '.h5', '.mtx', '.tsv', '.csv'])
const FORBIDDEN_NAME = /cell-level|barcodes|raw.?matrix|counts\.mtx|obs\.csv/i

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function looksLikeCellTable(value) {
  if (!Array.isArray(value) || value.length === 0 || !isRecord(value[0])) return false
  return ['barcode', 'cell_id', 'cellId', 'barcodes'].some((key) => key in value[0])
}

function assertSanitized(name, value) {
  const extension = extname(name).toLowerCase()
  if (FORBIDDEN_EXTENSIONS.has(extension) || FORBIDDEN_NAME.test(name)) {
    throw new Error(`refusing raw matrix or cell-level table: ${name}`)
  }
  if (looksLikeCellTable(value)) {
    throw new Error(`refusing cell-level table payload: ${name}`)
  }
}

async function listFiles(directory) {
  try {
    return (await readdir(directory, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => resolve(entry.parentPath ?? directory, entry.name))
  }
  catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return []
    throw error
  }
}

function sanitizePrimary(primary) {
  return {
    synthetic: primary.synthetic,
    protocolVersion: primary.protocolVersion,
    routerVersion: primary.routerVersion,
    seed: primary.seed,
    generatedAt: primary.generatedAt,
    aggregates: primary.aggregates,
  }
}

function sanitizeAblations(ablations) {
  return {
    synthetic: ablations.synthetic,
    protocolVersion: ablations.protocolVersion,
    routerVersion: ablations.routerVersion,
    seed: ablations.seed,
    generatedAt: ablations.generatedAt,
    foldIds: ablations.foldIds,
    ablations: (ablations.ablations ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      regretDelta: row.regretDelta,
      reason: row.reason,
    })),
    stability: {
      seeds: ablations.stability?.seeds,
      weightPerturbationFraction: ablations.stability?.weightPerturbationFraction,
      top3Jaccard: { mean: ablations.stability?.top3Jaccard?.mean },
      roleRetention: { mean: ablations.stability?.roleRetention?.mean },
    },
  }
}

function sanitizeCase(row) {
  const outcome = isRecord(row.outcome) ? row.outcome : {}
  const recommendations = Array.isArray(outcome.recommendations) ? outcome.recommendations : []
  return {
    accession: row.accession,
    id: row.id,
    role: row.role,
    biology: row.biology,
    claimCeiling: row.claimCeiling,
    compiled: row.compiled,
    geoObservationsAdded: row.geoObservationsAdded,
    outcome: {
      status: outcome.status,
      code: outcome.code,
      methodId: recommendations[0]?.methodId ?? null,
    },
    nonclaimScan: row.nonclaimScan,
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeHashed(name, value) {
  assertSanitized(name, value)
  const body = typeof value === 'string' ? (value.endsWith('\n') ? value : `${value}\n`) : `${JSON.stringify(value, null, 2)}\n`
  await writeFile(resolve(outputDirectory, name), body)
  return { name, sha256: sha256(body), bytes: Buffer.byteLength(body) }
}

export async function buildValidationAssets() {
  const sourceFiles = await listFiles(resultsDirectory)
  for (const path of sourceFiles) {
    assertSanitized(path, null)
  }

  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })

  const primary = await readJson(resolve(resultsDirectory, 'primary.json'))
  const ablations = await readJson(resolve(resultsDirectory, 'ablations.json'))
  const external = await readJson(resolve(resultsDirectory, 'external-holdout.json'))
  const configSmoke = await readJson(resolve(resultsDirectory, 'config-smoke.json'))
  const claim = await readJson(resolve(resultsDirectory, 'claim-status.json'))
  const report = await readFile(resolve(root, 'validation/report.md'), 'utf8')
  const caseNames = (await readdir(resolve(resultsDirectory, 'cases'))).filter((name) => name.endsWith('.json')).sort()
  const cases = []
  for (const name of caseNames) {
    cases.push(sanitizeCase(await readJson(resolve(resultsDirectory, 'cases', name))))
  }

  const written = [
    await writeHashed('claim-status.json', claim),
    await writeHashed('primary.aggregates.json', sanitizePrimary(primary)),
    await writeHashed('ablations.summary.json', sanitizeAblations(ablations)),
    await writeHashed('external-holdout.json', external),
    await writeHashed('config-smoke.json', configSmoke),
    await writeHashed('cases.summary.json', { synthetic: true, rows: cases }),
    await writeHashed('report.md', report),
  ]

  const hashes = Object.fromEntries(written.map((row) => [row.name, row.sha256]))
  const manifest = {
    evidenceVersion: claim.evidenceVersion,
    protocolVersion: claim.protocolVersion,
    routerVersion: claim.routerVersion,
    claimStatus: claim.status,
    synthetic: true,
    files: written,
  }
  written.push(await writeHashed('hashes.json', hashes))
  written.push(await writeHashed('manifest.json', manifest))

  const published = await listFiles(outputDirectory)
  for (const path of published) {
    assertSanitized(path, null)
  }

  return written.sort((left, right) => left.name.localeCompare(right.name))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const written = await buildValidationAssets()
  console.log(written.map((row) => row.name).join('\n'))
}
