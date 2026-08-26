import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('frozen validation protocol', () => {
  it('encodes the primary endpoint and claim gate before results exist', async () => {
    const protocol = await readJson('validation/protocol.json')
    assert.equal(protocol.version, 'router-validation-v1')
    assert.equal(protocol.seed, 20260823)
    assert.equal(protocol.bootstrapReplicates, 5000)
    assert.equal(protocol.routerReplicates, 200)
    assert.equal(protocol.primaryEndpoint, 'paired_normalized_regret_improvement_vs_global_average')
    assert.equal(protocol.claimGate.regretImprovementCiLowerBound, 0)
    assert.equal(protocol.claimGate.minimumEvaluableHoldoutTasks, 20)
    assert.equal(protocol.claimGate.minimumStudyGroups, 5)
    assert.equal(protocol.claimGate.top3NonInferiorityMargin, 0.05)
    assert.equal(protocol.externalHoldoutDatasetId, 'gse280270_ucb_tpo')
  })

  it('keeps the external holdout and GEO cases out of every fit fold', async () => {
    const splits = await readJson('validation/splits.json')
    const cases = await readJson('validation/cases.json')
    const datasets = await readJson('data/router/datasets.json')
    const observations = await readJson('data/router/observations.synthetic.json')
    const reserved = new Set(cases.map((row: { id: string }) => row.id))
    assert.ok(reserved.has('gse280270_ucb_tpo'))
    for (const fold of splits.folds) {
      for (const group of [...fold.heldOutStudyGroups, ...fold.fitStudyGroups]) {
        assert.equal(reserved.has(group), false)
      }
    }
    assert.equal(datasets.some((row: { id: string }) => reserved.has(row.id)), false)
    assert.equal(observations.some((row: { datasetId: string }) => reserved.has(row.datasetId)), false)
  })

  it('never lets one synthetic study group span fit and holdout in the same fold', async () => {
    const splits = await readJson('validation/splits.json')
    for (const fold of splits.folds) {
      const overlap = fold.heldOutStudyGroups.filter((group: string) => fold.fitStudyGroups.includes(group))
      assert.deepEqual(overlap, [])
    }
  })
})
