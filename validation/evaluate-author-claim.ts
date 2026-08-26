import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { FROZEN_CLAIM_FLOORS } from './src/claim-gate.ts'
import { loadAuthorCatalog } from './src/load-author-catalog.ts'

export interface AuthorClaimStatus {
  status: 'algorithmic_router' | 'software_resource'
  passed: boolean
  reasons: string[]
  protocolVersion: 'router-validation-v1'
  admissionVersion: 'router-author-admission-v1'
  routerVersion: 'router-core-v1'
  evidenceVersion: string
  syntheticUiCatalog: 'router-evidence-synthetic-v1'
  claimGate: typeof FROZEN_CLAIM_FLOORS
  studyGroups: string[]
  observationCount: number
  evaluatedAt: string
}

export async function evaluateAuthorClaim(): Promise<AuthorClaimStatus> {
  const catalog = await loadAuthorCatalog()
  const studyGroups = [...new Set(catalog.datasets
    .filter((dataset) => catalog.observations.some((row) => row.datasetId === dataset.id))
    .map((dataset) => dataset.studyGroup))]
  const reasons: string[] = []
  const evaluableHoldouts = 0
  if (evaluableHoldouts < FROZEN_CLAIM_FLOORS.minimumEvaluableHoldoutTasks) {
    reasons.push(`insufficient evaluable holdout tasks: ${evaluableHoldouts} < ${FROZEN_CLAIM_FLOORS.minimumEvaluableHoldoutTasks}`)
  }
  if (studyGroups.length < FROZEN_CLAIM_FLOORS.minimumStudyGroups) {
    reasons.push(`insufficient study groups: ${studyGroups.length} < ${FROZEN_CLAIM_FLOORS.minimumStudyGroups}`)
  }
  reasons.push('author catalog has no leakage-safe holdout protocol in this slice')
  reasons.push('external holdout is missing or not evaluable')
  if (catalog.observations.some((row) => row.methodId === 'CODE')) {
    reasons.push('CODE observations were invented')
  }
  const unique = [...new Set(reasons)]
  const status: AuthorClaimStatus = {
    status: unique.length === 0 ? 'algorithmic_router' : 'software_resource',
    passed: unique.length === 0,
    reasons: unique,
    protocolVersion: 'router-validation-v1',
    admissionVersion: 'router-author-admission-v1',
    routerVersion: 'router-core-v1',
    evidenceVersion: catalog.release.id,
    syntheticUiCatalog: 'router-evidence-synthetic-v1',
    claimGate: FROZEN_CLAIM_FLOORS,
    studyGroups,
    observationCount: catalog.observations.length,
    evaluatedAt: new Date().toISOString(),
  }
  return status
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const status = await evaluateAuthorClaim()
  const out = resolve(import.meta.dirname, 'results/author-claim-status.json')
  await writeFile(out, `${JSON.stringify(status, null, 2)}\n`)
  console.log(status.status, status.reasons.join(' | '))
  if (status.passed) process.exitCode = 1
}
