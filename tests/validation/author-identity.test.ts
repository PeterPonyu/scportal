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

describe('author catalog identity', () => {
  it('registers exactly the 13 thesis instruments and no fixture methods', async () => {
    const methods = await readJson('data/router/author/methods.json')
    const ids = methods.map((method: { id: string }) => method.id).sort()
    assert.deepEqual(ids, [...protocolMethods].sort())
    assert.equal(methods.every((method: { executable: boolean }) => method.executable === false), true)
    assert.equal(methods.some((method: { id: string }) => method.id === 'geometry_vae'), false)
  })

  it('keeps reserved GEO identities correctly labeled and empty of UCB/sleep scores', async () => {
    const datasets = await readJson('data/router/author/datasets.json')
    const byId = Object.fromEntries(datasets.map((dataset: { id: string }) => [dataset.id, dataset]))
    assert.equal(byId.gse277292_dapp1.studyGroup, 'dapp1_lsk')
    assert.equal(byId.gse278673_radiation.studyGroup, 'radiation_lsk')
    assert.match(byId.gse278673_radiation.id, /radiation/)
    assert.equal(byId.gse280270_ucb_tpo.studyGroup, 'ucb_tpo_holdout')
    assert.equal(byId.gse280145_sleep_deprivation.studyGroup, 'sleep_deprivation')
  })
})
