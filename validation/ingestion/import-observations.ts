import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { BenchmarkObservation } from '../../app/core/router/types.ts'

export interface ImportAudit {
  included: number
  excludedByReason: Record<string, number>
}

interface MetricMap {
  mappings: Array<{ sourceMetric: string; metricId: string; group: string; auxiliary: boolean }>
  exclusions: Array<{ sourceMetric: string; admit: boolean }>
}

function parseCsv(text: string): Array<Record<string, string>> {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  const headers = headerLine.split(',')
  return lines.filter((line) => line.length > 0).map((line) => {
    const cells = line.split(',')
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))
  })
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export async function importObservations(rootDir: string): Promise<BenchmarkObservation[]> {
  const map = JSON.parse(await readFile(resolve(rootDir, 'validation/ingestion/metric-map.json'), 'utf8')) as MetricMap
  const sourceIndex = JSON.parse(await readFile(resolve(rootDir, 'validation/ingestion/source-index.json'), 'utf8')) as {
    sources: Array<{ sourceId: string; paperId: string; extraction: string }>
  }
  const rows = parseCsv(await readFile(resolve(rootDir, 'validation/ingestion/sources/author-benchmarks.csv'), 'utf8'))
  const allowedSources = new Set(sourceIndex.sources.filter((source) => source.extraction === 'table' || source.extraction === 'supplement').map((source) => source.sourceId))
  const mappingBySource = new Map(map.mappings.map((row) => [row.sourceMetric, row]))
  const excludedMetrics = new Set(map.exclusions.filter((row) => row.admit === false).map((row) => row.sourceMetric))
  const bannedMethods = new Set(['CODE', 'slingshot', 'paga', 'monocle3', 'geometry_vae', 'graph_contrastive', 'neural_ode'])
  const emptyReserved = new Set(['gse280270_ucb_tpo', 'gse280145_sleep_deprivation'])
  const audit: ImportAudit = { included: 0, excludedByReason: {} }
  const bump = (reason: string) => {
    audit.excludedByReason[reason] = (audit.excludedByReason[reason] ?? 0) + 1
  }

  const observations: BenchmarkObservation[] = []
  for (const row of rows) {
    if (!allowedSources.has(row.sourceId)) { bump('source_not_indexed'); continue }
    if (bannedMethods.has(row.methodId)) { bump('banned_method'); continue }
    if (emptyReserved.has(row.datasetId)) { bump('reserved_empty'); continue }
    if (excludedMetrics.has(row.sourceMetric)) { bump('metric_excluded'); continue }
    const mapping = mappingBySource.get(row.sourceMetric)
    if (!mapping) { bump('metric_unmapped'); continue }
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
        methodVersion: row.methodId,
        runConfigId: row.sourceId,
        extractedAt: row.extractedAt,
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
