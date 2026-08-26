import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('author catalog bind', () => {
  it('binds a second digest and leaves the synthetic production digest untouched', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { loadAuthorCatalog } = await import('../../validation/src/load-author-catalog.ts')
    const production = await loadRouterCatalog()
    const author = await loadAuthorCatalog()
    assert.equal(production.release.id, 'router-evidence-synthetic-v1')
    assert.equal(production.release.synthetic, true)
    assert.equal(author.release.id, 'router-evidence-v1')
    assert.equal(author.release.synthetic, false)
    assert.notEqual(author.release.evidenceDigest, production.release.evidenceDigest)
    assert.equal(author.observations.every((row) => row.provenance.paperId === 'LAIOR'), true)
    assert.equal(author.methods.length, 13)
    const { routeMethods } = await import('../../app/core/router/index.ts')
    const refused = routeMethods({
      ...await import('../../validation/src/load-catalog.ts').then((module) => module.buildRouterInput(
        author.profiles.find((profile) => profile.id === 'quick_trajectory') ?? author.profiles[0],
        { ...author, release: production.release },
      )),
    })
    assert.equal(refused.status, 'REFUSED')

    const productionMethods = await readJson('data/router/methods.json')
    const productionRelease = await readJson('data/router/release.json')
    const productionObservations = await readJson('data/router/observations.synthetic.json')
    assert.equal(productionMethods.some((method: { id: string }) => method.id === 'geometry_vae'), true)
    assert.equal(productionRelease.id, 'router-evidence-synthetic-v1')
    assert.equal(productionObservations.length, 63)
  })

  it('does not point AutoSelect assets or reserved cases at the author catalog', async () => {
    const assets = await readFile(resolve(root, 'scripts/build_router_assets.mjs'), 'utf8')
    assert.match(assets, /observations\.synthetic\.json/)
    assert.doesNotMatch(assets, /data\/router\/author/)
    const cases = await readJson('validation/results/cases/gse280270_ucb_tpo.json')
    assert.equal(cases.outcome.status, 'REFUSED')
    assert.deepEqual(cases.outcome.evidenceGaps, ['reserved_identity_without_admitted_observations'])
    const dapp1 = await readJson('validation/results/cases/gse277292_dapp1.json')
    assert.equal(dapp1.outcome.status, 'REFUSED')
  })
})
