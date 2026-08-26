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

describe('author-benchmark import', () => {
  it('admits only the verified LAIOR per-dataset cells', async () => {
    const { importObservations } = await import('../../validation/ingestion/import-observations.ts')
    const rows = await importObservations(root)
    assert.equal(rows.length, 4)
    assert.deepEqual(rows.map((row) => [row.datasetId, row.methodId, row.metricId, row.rawValue]), [
      ['gse277292_dapp1', 'LAIOR', 'nmi', 0.546],
      ['gse278673_radiation', 'LAIOR', 'ari', 0.691],
      ['gse278673_radiation', 'LAIOR', 'calinski_harabasz', 5125],
      ['gse278673_radiation', 'LAIOR', 'nmi', 0.693],
    ])
    for (const row of rows) {
      assert.equal(row.provenance.paperId, 'LAIOR')
      assert.match(row.provenance.locator, /Fig\. 8/)
    }
  })

  it('excludes CODE, C-panel paths, Saelens, and reserved empty accessions', async () => {
    const exclusions = (await readFile(resolve(root, 'validation/ingestion/sources/exclusions.csv'), 'utf8'))
    assert.match(exclusions, /CODE/)
    assert.match(exclusions, /representation_panel.csv/)
    assert.match(exclusions, /saelens-2019/)
    assert.match(exclusions, /GSE280270/)
    assert.match(exclusions, /GSE280145/)
    const { importObservations } = await import('../../validation/ingestion/import-observations.ts')
    const rows = await importObservations(root)
    assert.equal(rows.some((row) => row.methodId === 'CODE'), false)
    assert.equal(rows.some((row) => row.datasetId === 'gse280270_ucb_tpo'), false)
  })
})
