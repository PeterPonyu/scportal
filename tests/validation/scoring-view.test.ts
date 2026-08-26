import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

describe('validation scoring view', () => {
  it('imports routeMethods and compileConfig from production core only', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../validation/src/router-import.ts'), 'utf8')
    assert.match(source, /from '\.\.\/\.\.\/app\/core\/router\/index\.ts'/)
    assert.match(source, /from '\.\.\/\.\.\/app\/core\/config\/compiler\.ts'/)
    assert.equal(source.includes('function routeMethods'), false)
    assert.equal(source.includes('function compileConfig'), false)
  })

  it('rebinds evidenceDigest when the scoring view flips executable in memory', async () => {
    const { loadRouterCatalog, scoringView } = await import('../../validation/src/scoring-view.ts')
    const catalog = await loadRouterCatalog()
    assert.equal(catalog.methods.every((method: { executable: boolean }) => method.executable === false), true)
    const scored = scoringView(catalog)
    assert.equal(scored.methods.every((method: { executable: boolean }) => method.executable === true), true)
    assert.notEqual(scored.release.evidenceDigest, catalog.release.evidenceDigest)
    assert.equal(scored.release.synthetic, true)
    const { routeMethods } = await import('../../validation/src/router-import.ts')
    const profile = (await import('../../data/router/task-profiles.json', { with: { type: 'json' } })).default.find((row: { id: string }) => row.id === 'quick_trajectory')
    const outcome = routeMethods({
      profile,
      datasets: scored.datasets,
      methods: scored.methods,
      metrics: scored.metrics,
      observations: scored.observations,
      routerVersion: 'router-core-v1',
      release: scored.release,
    })
    assert.notEqual(outcome.status === 'REFUSED' && outcome.evidenceGaps.some((gap: string) => gap.includes('does not bind')), true)
  })

  it('refuses a subset posted under the production digest', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { routeMethods } = await import('../../validation/src/router-import.ts')
    const catalog = await loadRouterCatalog()
    const held = catalog.datasets[0].id
    const subset = catalog.observations.filter((row: { datasetId: string }) => row.datasetId !== held)
    const outcome = routeMethods({
      profile: { ...catalog.profiles[0], id: 'autoselect-session' },
      datasets: catalog.datasets,
      methods: catalog.methods,
      metrics: catalog.metrics,
      observations: subset,
      routerVersion: 'router-core-v1',
      release: catalog.release,
    })
    assert.equal(outcome.status, 'REFUSED')
    assert.match(JSON.stringify(outcome.evidenceGaps), /does not bind/)
  })
})
