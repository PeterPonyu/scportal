import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const HOLDOUT_ID = 'gse280270_ucb_tpo'

describe('sealed external holdout guard', () => {
  it('confirms gse280270_ucb_tpo is absent from datasets and observations', async () => {
    const datasets = JSON.parse(await readFile(resolve(import.meta.dirname, '../../data/router/datasets.json'), 'utf8')) as Array<{ id: string; aliases: string[] }>
    const observations = JSON.parse(await readFile(resolve(import.meta.dirname, '../../data/router/observations.synthetic.json'), 'utf8')) as Array<{ datasetId: string }>
    assert.equal(datasets.some((row) => row.id === HOLDOUT_ID || row.aliases.includes(HOLDOUT_ID)), false)
    assert.equal(observations.some((row) => row.datasetId === HOLDOUT_ID), false)
  })

  it('writes evaluable false with holdout_evidence_missing and never invents a score', async () => {
    const { sealedExternalHoldout } = await import('../../validation/run-external-holdout.ts')
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const catalog = await loadRouterCatalog()
    const result = sealedExternalHoldout({
      datasets: catalog.datasets,
      observations: catalog.observations,
    })
    assert.deepEqual(result, {
      evaluable: false,
      reason: 'holdout_evidence_missing',
      datasetId: HOLDOUT_ID,
    })
    assert.equal(Object.hasOwn(result, 'score'), false)
    assert.equal(Object.hasOwn(result, 'normalizedRegret'), false)
    assert.equal(Object.hasOwn(result, 'regretDelta'), false)
    assert.equal(Object.hasOwn(result, 'methodId'), false)
  })

  it('fails the guard when a score is invented without evidence', async () => {
    const { sealedExternalHoldout } = await import('../../validation/run-external-holdout.ts')
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const catalog = await loadRouterCatalog()
    const input = { datasets: catalog.datasets, observations: catalog.observations }
    assert.throws(
      () => sealedExternalHoldout(input, { evaluable: true }),
      /invent|without evidence|holdout/i,
    )
    assert.throws(
      () => sealedExternalHoldout(input, { evaluable: false, score: 0.91 }),
      /invent|without evidence|holdout/i,
    )
    assert.throws(
      () => sealedExternalHoldout(input, { normalizedRegret: 0 }),
      /invent|without evidence|holdout/i,
    )
    assert.throws(
      () => sealedExternalHoldout(input, {
        evaluable: true,
        datasetId: HOLDOUT_ID,
        observations: [{ datasetId: HOLDOUT_ID, methodId: 'geometry_vae', metricId: 'intrinsic_geometry', rawValue: 0.9 }],
      }),
      /invent|without evidence|holdout/i,
    )
  })

  it('does not call routeMethods, invent UCB rows, or download GEO', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../validation/run-external-holdout.ts'), 'utf8')
    assert.equal(source.includes('routeMethods'), false)
    assert.equal(/ncbi\.nlm\.nih\.gov|geo\/query|fetch\(|https:\/\/|http:\/\/|downloadGEO|h5ad/i.test(source), false)
    assert.equal(/fake UCB|invented observation|synthetic_ucb/i.test(source), false)
  })
})
