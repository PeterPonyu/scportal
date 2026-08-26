import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const protocolMethods = [
  'iVAE', 'CCVGAE', 'LiVAE', 'GAHIB', 'MCCVAE',
  'GNODEVAE', 'CODE', 'iAODE', 'LAIOR',
  'scRL', 'scFocus', 'CLOP-DiT', 'scCCVGBen',
]

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('author remaining lattice', () => {
  it('freezes main-text exhaustion against the live author catalog', async () => {
    const lattice = await readJson('validation/author-admission/remaining-lattice.json')
    const observations = await readJson('data/router/author/observations.json')
    assert.equal(lattice.version, 'router-author-lattice-v1')
    assert.equal(lattice.evidenceReleaseId, 'router-evidence-v1')
    assert.equal(lattice.uiCatalog, 'router-evidence-synthetic-v1')
    assert.equal(lattice.claimStatus, 'software_resource')
    assert.deepEqual(lattice.methodIds, protocolMethods)
    assert.equal(lattice.methods.length, 13)
    assert.deepEqual(lattice.methods.map((row: { id: string }) => row.id), protocolMethods)
    const admitted = Object.fromEntries(lattice.methods.map((row: { id: string; admittedObservationCount: number }) => [row.id, row.admittedObservationCount]))
    assert.equal(admitted.LAIOR, 5)
    assert.equal(admitted.scRL, 6)
    for (const id of protocolMethods.filter((method) => method !== 'LAIOR' && method !== 'scRL')) {
      assert.equal(admitted[id], 0, id)
    }
    const latticeSum = lattice.methods.reduce((sum: number, row: { admittedObservationCount: number }) => sum + row.admittedObservationCount, 0)
    assert.equal(latticeSum, 11)
    assert.equal(observations.length, 11)
    assert.equal(observations.filter((row: { methodId: string }) => row.methodId === 'LAIOR').length, 5)
    assert.equal(observations.filter((row: { methodId: string }) => row.methodId === 'scRL').length, 6)
    assert.equal(lattice.methods.filter((row: { status: string }) => row.status === 'admitted').map((row: { id: string }) => row.id).join(','), 'LAIOR,scRL')
    assert.equal(lattice.methods.find((row: { id: string }) => row.id === 'CODE').status, 'blocked_until')
    assert.equal(lattice.methods.find((row: { id: string }) => row.id === 'scFocus').status, 'blocked_until')
    assert.equal(lattice.methods.find((row: { id: string }) => row.id === 'iVAE').status, 'main_text_exhausted')
    assert.equal(lattice.observationCount, 11)
    assert.equal(lattice.observationCount, observations.length)
    assert.equal(lattice.studyGroupCount, 5)
    assert.equal(lattice.evaluableHoldouts, 0)
  })

  it('leaves production and reserved GEO cases on the synthetic path', async () => {
    const production = await readJson('data/router/release.json')
    const reservedCases = [
      await readJson('validation/results/cases/gse280270_ucb_tpo.json'),
      await readJson('validation/results/cases/gse277292_dapp1.json'),
      await readJson('validation/results/cases/gse278673_radiation.json'),
      await readJson('validation/results/cases/gse280145_sleep_deprivation.json'),
    ]
    assert.equal(production.id, 'router-evidence-synthetic-v1')
    assert.equal(production.synthetic, true)
    for (const row of reservedCases) {
      assert.equal(row.outcome.status, 'REFUSED')
      assert.deepEqual(row.outcome.evidenceGaps, ['reserved_identity_without_admitted_observations'])
      assert.equal(row.outcome.evidenceVersion, 'router-evidence-synthetic-v1')
    }
  })
})
