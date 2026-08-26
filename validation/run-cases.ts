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
import { routeMethods } from './src/router-import.ts'
import { buildRouterInput, loadRouterCatalog, scoringView } from './src/scoring-view.ts'

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
  const scored = scoringView(catalog)
  const cases = reservedCases()
  const rows: CaseRouteRow[] = []

  for (const row of cases) {
    assertAccessionIdentity(row)
    const outcome = routeMethods(buildRouterInput(row.profile, scored), {
      bootstrapReplicates: 200,
      outrankingDelta: 0.02,
    })
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
