import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { rfc3339DateTime } from '../../app/core/router/validation.ts'
import type { BenchmarkObservation, MethodCapability } from '../../app/core/router/types.ts'

export interface ImportAudit {
  included: number
  excludedByReason: Record<string, number>
}

export interface SourceRow {
  sourceId: string
  paperId: string
  datasetAccession: string
  datasetId: string
  methodId: string
  sourceMetric: string
  rawValue: string
  locator: string
  extraction: string
  extractedAt: string
}

interface MetricMap {
  mappings: Array<{ sourceMetric: string; metricId: string; group: string; auxiliary: boolean }>
  exclusions: Array<{ sourceMetric: string; admit: boolean }>
}

const EMPTY_RESERVED_ACCESSIONS = new Set(['GSE280270', 'GSE280145'])
const EMPTY_RESERVED_DATASET_IDS = new Set(['gse280270_ucb_tpo', 'gse280145_sleep_deprivation'])
const BANNED_METHODS = new Set(['CODE', 'slingshot', 'paga', 'monocle3', 'geometry_vae', 'graph_contrastive', 'neural_ode'])

export function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (inQuotes) {
      if (character === '"' && line[index + 1] === '"') {
        current += '"'
        index += 1
      }
      else if (character === '"') inQuotes = false
      else current += character
    }
    else if (character === '"') inQuotes = true
    else if (character === ',') {
      cells.push(current)
      current = ''
    }
    else current += character
  }
  cells.push(current)
  return cells
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  const headers = parseCsvLine(headerLine)
  return lines.filter((line) => line.length > 0).map((line) => {
    const cells = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  })
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function toRfc3339DateTime(value: string): string | undefined {
  if (rfc3339DateTime(value)) return value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const normalized = `${value}T00:00:00Z`
    return rfc3339DateTime(normalized) ? normalized : undefined
  }
  return undefined
}

export function rowMatchesExclusion(row: SourceRow, identity: string): boolean {
  if (!identity) return false
  return row.methodId === identity
    || row.paperId === identity
    || row.datasetAccession === identity
    || row.datasetId === identity
    || row.sourceId === identity
    || row.sourceMetric === identity
    || row.locator.includes(identity)
}

export function authorReleaseMeta(
  meta: { id: string; synthetic: boolean; description: string },
  observations: readonly BenchmarkObservation[],
): { id: string; synthetic: boolean; description: string } {
  const published = observations.length > 0 && observations.every((row) =>
    row.provenance.paperId.length > 0 && row.provenance.locator.length > 0)
  return published ? meta : { ...meta, synthetic: true }
}

export async function importObservations(rootDir: string): Promise<BenchmarkObservation[]> {
  const map = JSON.parse(await readFile(resolve(rootDir, 'validation/ingestion/metric-map.json'), 'utf8')) as MetricMap
  const sourceIndex = JSON.parse(await readFile(resolve(rootDir, 'validation/ingestion/source-index.json'), 'utf8')) as {
    sources: Array<{ sourceId: string; paperId: string; extraction: string }>
  }
  const methods = JSON.parse(await readFile(resolve(rootDir, 'data/router/author/methods.json'), 'utf8')) as MethodCapability[]
  const versions = new Map(methods.map((method) => [method.id, method.version]))
  const rows = parseCsv(await readFile(resolve(rootDir, 'validation/ingestion/sources/author-benchmarks.csv'), 'utf8')) as SourceRow[]
  const exclusionRows = parseCsv(await readFile(resolve(rootDir, 'validation/ingestion/sources/exclusions.csv'), 'utf8'))
  const allowedSources = new Set(sourceIndex.sources.filter((source) => source.extraction === 'table' || source.extraction === 'supplement').map((source) => source.sourceId))
  const mappingBySource = new Map(map.mappings.map((row) => [row.sourceMetric, row]))
  const excludedMetrics = new Set(map.exclusions.filter((row) => row.admit === false).map((row) => row.sourceMetric))
  const audit: ImportAudit = { included: 0, excludedByReason: {} }
  const bump = (reason: string) => {
    audit.excludedByReason[reason] = (audit.excludedByReason[reason] ?? 0) + 1
  }

  const observations: BenchmarkObservation[] = []
  for (const row of rows) {
    if (!allowedSources.has(row.sourceId)) { bump('source_not_indexed'); continue }
    if (BANNED_METHODS.has(row.methodId)) { bump('banned_method'); continue }
    if (EMPTY_RESERVED_DATASET_IDS.has(row.datasetId) || EMPTY_RESERVED_ACCESSIONS.has(row.datasetAccession)) {
      bump('reserved_empty')
      continue
    }
    if (exclusionRows.some((exclusion) => rowMatchesExclusion(row, exclusion.identity))) {
      bump('denylist')
      continue
    }
    if (excludedMetrics.has(row.sourceMetric)) { bump('metric_excluded'); continue }
    const mapping = mappingBySource.get(row.sourceMetric)
    if (!mapping) { bump('metric_unmapped'); continue }
    const methodVersion = versions.get(row.methodId)
    if (!methodVersion) { bump('unknown_method'); continue }
    const extractedAt = toRfc3339DateTime(row.extractedAt)
    if (!extractedAt) { bump('invalid_extracted_at'); continue }
    const rawValue = Number(row.rawValue)
    if (!Number.isFinite(rawValue)) { bump('non_finite'); continue }
    observations.push({
      datasetId: row.datasetId,
      methodId: row.methodId,
      metricId: mapping.metricId,
      rawValue,
      provenance: {
        paperId: row.paperId,
        locator: row.locator,
        datasetVersion: row.datasetAccession,
        methodVersion,
        runConfigId: row.sourceId,
        extractedAt,
      },
    })
    audit.included += 1
  }

  observations.sort((left, right) =>
    left.datasetId < right.datasetId ? -1 : left.datasetId > right.datasetId ? 1
      : left.methodId < right.methodId ? -1 : left.methodId > right.methodId ? 1
        : left.metricId < right.metricId ? -1 : left.metricId > right.metricId ? 1 : 0)

  const curatedHeader = 'datasetId,methodId,metricId,rawValue,paperId,locator,datasetVersion,methodVersion,runConfigId,extractedAt'
  const curatedBody = observations.map((row) => [
    row.datasetId, row.methodId, row.metricId, String(row.rawValue),
    row.provenance.paperId, csvEscape(row.provenance.locator), row.provenance.datasetVersion,
    row.provenance.methodVersion, row.provenance.runConfigId, row.provenance.extractedAt,
  ].join(','))
  await writeFile(
    resolve(rootDir, 'validation/ingestion/sources/observations-curated.csv'),
    [curatedHeader, ...curatedBody].join('\n') + '\n',
  )
  await writeFile(
    resolve(rootDir, 'validation/ingestion/sources/import-audit.json'),
    `${JSON.stringify(audit, null, 2)}\n`,
  )
  return observations
}

export async function auditObservations(rootDir: string): Promise<ImportAudit> {
  await importObservations(rootDir)
  return JSON.parse(await readFile(resolve(rootDir, 'validation/ingestion/sources/import-audit.json'), 'utf8')) as ImportAudit
}
