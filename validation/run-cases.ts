import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RouterOutcome } from '../app/core/router/types.ts'
import {
  assertAccessionIdentity,
  collectRenderedStrings,
  loadNonclaims,
  reservedCases,
  scanNonclaims,
  type NonclaimScan,
  type ReservedCase,
} from './src/case-profiles.ts'
import { loadRouterCatalog } from './src/load-catalog.ts'

export interface CaseRouteRow {
  accession: string
  id: string
  role: ReservedCase['role']
  biology: string
  claimCeiling: string
  weightsSource: ReservedCase['weightsSource']
  seed: 20260823
  compiled: false
  geoObservationsAdded: false
  outcome: RouterOutcome
  nonclaimScan: NonclaimScan
}

export interface CaseRouteResult {
  seed: 20260823
  synthetic: true
  protocolVersion: 'router-validation-v1'
  routerVersion: 'router-core-v1'
  geoObservationsAdded: false
  compiled: false
  rows: CaseRouteRow[]
}

function refuseReservedCase(evidenceVersion: string): RouterOutcome {
  return {
    status: 'REFUSED',
    code: 'INSUFFICIENT_EVIDENCE',
    candidates: [],
    evidenceGaps: ['reserved_identity_without_admitted_observations'],
    seed: 20260823,
    evidenceVersion,
    routerVersion: 'router-core-v1',
  }
}

function scanCase(row: ReservedCase, outcome: RouterOutcome): NonclaimScan {
  const rendered = collectRenderedStrings({
    accession: row.accession,
    id: row.id,
    role: row.role,
    biology: row.biology,
    claimCeiling: row.claimCeiling,
    outcome,
  }).join('\n')
  return scanNonclaims(rendered, loadNonclaims())
}

export async function runCases(): Promise<CaseRouteResult> {
  const catalog = await loadRouterCatalog()
  const evidenceVersion = catalog.release.id
  const cases = reservedCases()
  const rows: CaseRouteRow[] = []

  for (const row of cases) {
    assertAccessionIdentity(row)
    const outcome = refuseReservedCase(evidenceVersion)
    const nonclaimScan = scanCase(row, outcome)
    if (!nonclaimScan.ok) {
      throw new Error(`nonclaim scan failed for ${row.id}: ${nonclaimScan.hits.join('; ')}`)
    }
    rows.push({
      accession: row.accession,
      id: row.id,
      role: row.role,
      biology: row.biology,
      claimCeiling: row.claimCeiling,
      weightsSource: row.weightsSource,
      seed: 20260823,
      compiled: false,
      geoObservationsAdded: false,
      outcome,
      nonclaimScan,
    })
  }

  const directory = resolve(import.meta.dirname, 'results/cases')
  await mkdir(directory, { recursive: true })
  for (const row of rows) {
    await writeFile(resolve(directory, `${row.id}.json`), `${JSON.stringify(row, null, 2)}\n`)
  }

  return {
    seed: 20260823,
    synthetic: true,
    protocolVersion: 'router-validation-v1',
    routerVersion: 'router-core-v1',
    geoObservationsAdded: false,
    compiled: false,
    rows,
  }
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runCases()
}
