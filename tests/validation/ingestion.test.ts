import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('author metric map', () => {
  it('keeps ARI/NMI auxiliary in biology and never in geometry/continuity/trajectory', async () => {
    const map = await readJson('validation/ingestion/metric-map.json')
    for (const row of map.mappings) {
      if (row.sourceMetric === 'ARI' || row.sourceMetric === 'NMI') {
        assert.equal(row.metricId, row.sourceMetric === 'ARI' ? 'ari' : 'nmi')
        assert.equal(row.group, 'biology')
        assert.equal(row.auxiliary, true)
      }
      if (row.group === 'latent_geometry' || row.group === 'continuity' || row.group === 'trajectory') {
        assert.notEqual(row.metricId, 'ari')
        assert.notEqual(row.metricId, 'nmi')
      }
    }
  })

  it('excludes generation constructs and opposite-direction COR collisions', async () => {
    const map = await readJson('validation/ingestion/metric-map.json')
    const bySource = Object.fromEntries(map.exclusions.map((row) => [row.sourceMetric, row]))
    assert.equal(bySource.KNN_Top1.admit, false)
    assert.equal(bySource.Steering.admit, false)
    assert.equal(bySource.iVAE_delta.admit, false)
    assert.match(bySource.iVAE_Pearson_vs_LiVAE_COR.reason, /opposite direction/i)
  })
})
