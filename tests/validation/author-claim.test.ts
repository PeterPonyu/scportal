import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FROZEN_CLAIM_FLOORS } from '../../validation/src/claim-gate.ts'

describe('author claim gate', () => {
  it('uses the frozen floors and does not promote two GEO cells to algorithmic_router', async () => {
    const { evaluateAuthorClaim } = await import('../../validation/evaluate-author-claim.ts')
    const status = await evaluateAuthorClaim()
    assert.equal(status.claimGate.minimumEvaluableHoldoutTasks, FROZEN_CLAIM_FLOORS.minimumEvaluableHoldoutTasks)
    assert.equal(status.claimGate.minimumStudyGroups, FROZEN_CLAIM_FLOORS.minimumStudyGroups)
    assert.equal(status.status, 'software_resource')
    assert.equal(status.passed, false)
    assert.equal(status.studyGroups.length, 5)
    assert.equal(status.reasons.some((reason) => reason.includes('insufficient evaluable holdout')), true)
    assert.equal(status.reasons.some((reason) => reason.includes('insufficient study groups')), false)
    assert.equal(status.evidenceVersion, 'router-evidence-v1')
    assert.equal(status.syntheticUiCatalog, 'router-evidence-synthetic-v1')
  })
})
