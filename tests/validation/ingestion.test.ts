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
    const laiorCor = map.mappings.find((row: { sourceMetric: string }) => row.sourceMetric === 'LAIOR_COR')
    assert.equal(laiorCor.metricId, 'laior_coupling')
    assert.equal(laiorCor.group, 'continuity')
    assert.deepEqual(laiorCor.papers, ['LAIOR'])
    for (const sourceMetric of ['SCRL_MAS_PSEUDOTIME', 'SCRL_MAS_FATE', 'SCRL_PAAC_PSEUDOTIME', 'SCRL_PAAC_FATE']) {
      const row = map.mappings.find((item: { sourceMetric: string }) => item.sourceMetric === sourceMetric)
      assert.equal(row.group, 'trajectory')
      assert.equal(row.auxiliary, true)
      assert.deepEqual(row.papers, ['scRL'])
      assert.notEqual(row.metricId, 'laior_coupling')
    }
    assert.equal(bySource.SCRL_DELTA.admit, false)
  })
})

describe('author-benchmark import', () => {
  it('admits verified LAIOR Fig. 8, scRL absolute MAS/PAAC, and CCVGAE Table 7 per-epoch cells', async () => {
    const { importObservations } = await import('../../validation/ingestion/import-observations.ts')
    const rows = await importObservations(root)
    assert.equal(rows.length, 21)
    assert.deepEqual(rows.map((row) => [row.datasetId, row.methodId, row.metricId, row.rawValue]), [
      ['ccvgae_blood_aged', 'CCVGAE', 'ccvgae_per_epoch_s', 1.57],
      ['ccvgae_endo', 'CCVGAE', 'ccvgae_per_epoch_s', 0.36],
      ['ccvgae_hemato', 'CCVGAE', 'ccvgae_per_epoch_s', 3.08],
      ['ccvgae_hesc', 'CCVGAE', 'ccvgae_per_epoch_s', 1.17],
      ['ccvgae_setty', 'CCVGAE', 'ccvgae_per_epoch_s', 0.66],
      ['gse117498_pheno_hsc', 'scRL', 'scrl_mas_fate', 0.674],
      ['gse132188_endo', 'scRL', 'scrl_mas_pseudotime', 0.865],
      ['gse198730', 'CCVGAE', 'ccvgae_per_epoch_s', 0.60],
      ['gse206767', 'CCVGAE', 'ccvgae_per_epoch_s', 1.61],
      ['gse277292_dapp1', 'LAIOR', 'nmi', 0.546],
      ['gse278673_radiation', 'LAIOR', 'ari', 0.691],
      ['gse278673_radiation', 'LAIOR', 'calinski_harabasz', 5125],
      ['gse278673_radiation', 'LAIOR', 'laior_coupling', 0.557],
      ['gse278673_radiation', 'LAIOR', 'nmi', 0.693],
      ['gsm5124061', 'CCVGAE', 'ccvgae_per_epoch_s', 0.44],
      ['gsm6638254', 'CCVGAE', 'ccvgae_per_epoch_s', 0.89],
      ['gsm7308367', 'CCVGAE', 'ccvgae_per_epoch_s', 1.27],
      ['s_subs8_cd34', 'scRL', 'scrl_mas_fate', 0.323],
      ['s_subs8_cd34', 'scRL', 'scrl_mas_pseudotime', 0.773],
      ['s_subs8_cd34', 'scRL', 'scrl_paac_fate', 0.373],
      ['s_subs8_cd34', 'scRL', 'scrl_paac_pseudotime', 0.848],
    ])
    assert.equal(rows.filter((row) => row.methodId === 'CCVGAE').length, 10)
    assert.equal(rows.some((row) => row.datasetId === 'gse132188_endo' && row.methodId === 'CCVGAE'), false)
    for (const row of rows.filter((item) => item.methodId === 'CCVGAE')) {
      assert.equal(row.metricId, 'ccvgae_per_epoch_s')
      assert.equal(row.provenance.paperId, 'CCVGAE')
      assert.equal(row.provenance.locator, 'Table 7 runtime')
    }
    for (const row of rows) {
      assert.ok(['LAIOR', 'scRL', 'CCVGAE'].includes(row.provenance.paperId))
      assert.equal(row.provenance.methodVersion, '0.0.0-author')
      assert.match(row.provenance.extractedAt, /^2026-08-26T00:00:00Z$/)
    }
  })

  it('excludes CODE, C-panel paths, Saelens, and reserved empty accessions', async () => {
    const exclusions = (await readFile(resolve(root, 'validation/ingestion/sources/exclusions.csv'), 'utf8'))
    assert.match(exclusions, /CODE/)
    assert.match(exclusions, /representation_panel.csv/)
    assert.match(exclusions, /saelens-2019/)
    assert.match(exclusions, /GSE280270/)
    assert.match(exclusions, /GSE280145/)
    const {
      importObservations,
      rowMatchesExclusion,
      toRfc3339DateTime,
      authorReleaseMeta,
    } = await import('../../validation/ingestion/import-observations.ts')
    const rows = await importObservations(root)
    assert.equal(rows.some((row) => row.methodId === 'CODE'), false)
    assert.equal(rows.some((row) => row.datasetId === 'gse280270_ucb_tpo'), false)
    assert.equal(rowMatchesExclusion({
      sourceId: 'x', paperId: 'CODE', datasetAccession: 'GSE1', datasetId: 'gse1',
      methodId: 'CODE', sourceMetric: 'NMI', rawValue: '1', locator: 't', extraction: 'table', extractedAt: '2026-08-26',
    }, 'CODE'), true)
    assert.equal(rowMatchesExclusion({
      sourceId: 'x', paperId: 'LAIOR', datasetAccession: 'GSE280270', datasetId: 'other',
      methodId: 'LAIOR', sourceMetric: 'NMI', rawValue: '1', locator: 't', extraction: 'table', extractedAt: '2026-08-26',
    }, 'GSE280270'), true)
    assert.equal(toRfc3339DateTime('2026-08-26'), '2026-08-26T00:00:00Z')
    assert.equal(authorReleaseMeta({ id: 'router-evidence-v1', synthetic: false, description: 'x' }, []).synthetic, true)
  })

  it('rejects planted means, deltas, CODE scores, and scFocus digits', async () => {
    const {
      rowMatchesExclusion,
    } = await import('../../validation/ingestion/import-observations.ts')
    const map = await readJson('validation/ingestion/metric-map.json')
    const excluded = new Set(map.exclusions.filter((row: { admit: boolean }) => row.admit === false).map((row: { sourceMetric: string }) => row.sourceMetric))
    assert.equal(excluded.has('iVAE_delta'), true)
    assert.equal(excluded.has('SCRL_DELTA'), true)
    assert.equal(excluded.has('KNN_Top1'), true)
    const plant = (overrides: Record<string, string>) => ({
      sourceId: 'planted', paperId: 'MCCVAE', datasetAccession: 'GSE1', datasetId: 'gse1',
      methodId: 'MCCVAE', sourceMetric: 'ASW', rawValue: '0.5', locator: 'MCCVAE A.1-A.16',
      extraction: 'table', extractedAt: '2026-08-26',
      ...overrides,
    })
    assert.equal(rowMatchesExclusion(plant({}), 'MCCVAE A.1-A.16'), true)
    assert.equal(rowMatchesExclusion(plant({ methodId: 'CODE', paperId: 'CODE', locator: 'invented' }), 'CODE'), true)
    assert.equal(rowMatchesExclusion(plant({ methodId: 'scFocus', paperId: 'scFocus', locator: 'Fig. 4' }), 'scFocus'), true)
  })
})
