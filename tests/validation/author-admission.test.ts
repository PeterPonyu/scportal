import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('author admission ledger', () => {
  it('freezes 13×A identity and the same claim floors', async () => {
    const protocol = await readJson('validation/author-admission/protocol.json')
    assert.equal(protocol.version, 'router-author-admission-v1')
    assert.equal(protocol.evidenceReleaseId, 'router-evidence-v1')
    assert.equal(protocol.validationProtocolVersion, 'router-validation-v1')
    assert.deepEqual(protocol.methodIds, [
      'iVAE', 'CCVGAE', 'LiVAE', 'GAHIB', 'MCCVAE',
      'GNODEVAE', 'CODE', 'iAODE', 'LAIOR',
      'scRL', 'scFocus', 'CLOP-DiT', 'scCCVGBen',
    ])
    assert.equal(protocol.claimGate.minimumEvaluableHoldoutTasks, 20)
    assert.equal(protocol.claimGate.minimumStudyGroups, 5)
    assert.equal(protocol.claimGate.regretImprovementCiLowerBound, 0)
    assert.equal(protocol.claimGate.top3NonInferiorityMargin, 0.05)
    assert.equal(protocol.uiCatalog, 'router-evidence-synthetic-v1')
    assert.equal(protocol.authorCatalogDirectory, 'data/router/author')
  })

  it('names the foreign boards and locked panels that must be rejected', async () => {
    const rejects = await readJson('validation/author-admission/rejects.json')
    for (const id of [
      'saelens-2019-dynbenchmark',
      'scib',
      'openproblems',
      'results-en-panel-representation',
      'results-formal-metrics',
      'code-pdf-missing',
      'scfocus-unaudited-digitization',
    ]) {
      assert.equal(rejects[id].admit, false, id)
    }
    assert.match(rejects['code-pdf-missing'].reason, /do not invent CODE numbers/i)
  })
})
