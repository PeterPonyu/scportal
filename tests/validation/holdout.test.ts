import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import type { RouterCatalog } from '../../validation/src/load-catalog.ts'

const SYSTEMS = [
  'router',
  'global_average',
  'most_frequent_top',
  'context_free_tree',
  'weighted_sum',
  'random_compatible',
] as const

function canonicalDatasetId(catalog: RouterCatalog, datasetId: string): string {
  for (const dataset of catalog.datasets) {
    if (dataset.id === datasetId || dataset.aliases.includes(datasetId)) return dataset.id
  }
  return datasetId
}

function withSiblingBranchDataset(catalog: RouterCatalog): RouterCatalog {
  const branch = catalog.datasets.find((dataset) => dataset.studyGroup === 'synthetic-contract-fixture-branch')
  if (!branch) throw new Error('missing branch study group')
  const sibling = {
    ...structuredClone(branch),
    id: 'synthetic_branch_time_sibling',
    aliases: ['synthetic-branch-time-sibling-v1'],
  }
  const extra = catalog.observations
    .filter((row) => row.datasetId === branch.id)
    .map((row) => ({ ...structuredClone(row), datasetId: sibling.id }))
  return {
    ...catalog,
    datasets: [...catalog.datasets, sibling],
    observations: [...catalog.observations, ...extra],
  }
}

describe('grouped holdout', () => {
  it('drops every dataset and observation from the held-out study group', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { partitionFold } = await import('../../validation/src/holdout.ts')
    const catalog = await loadRouterCatalog()
    const fold = {
      id: 'logo-synthetic-contract-fixture-branch',
      heldOutStudyGroups: ['synthetic-contract-fixture-branch'],
      fitStudyGroups: ['synthetic-contract-fixture-sparse', 'synthetic-contract-fixture-linear'],
    }
    const partition = partitionFold(catalog, fold)
    const heldIds = new Set(
      catalog.datasets.filter((dataset) => dataset.studyGroup === 'synthetic-contract-fixture-branch').map((dataset) => dataset.id),
    )
    assert.equal(partition.fitView.datasets.some((dataset) => heldIds.has(dataset.id)), false)
    assert.equal(
      partition.fitView.observations.some((row) => heldIds.has(canonicalDatasetId(catalog, row.datasetId))),
      false,
    )
    assert.equal(partition.holdoutDatasets.every((dataset) => heldIds.has(dataset.id)), true)
    assert.equal(
      partition.holdoutObservations.every((row) => heldIds.has(canonicalDatasetId(catalog, row.datasetId))),
      true,
    )
    assert.equal(partition.holdoutObservations.length > 0, true)
  })

  it('drops both datasets when one synthetic study group has two', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { partitionFold } = await import('../../validation/src/holdout.ts')
    const catalog = withSiblingBranchDataset(await loadRouterCatalog())
    const partition = partitionFold(catalog, {
      id: 'logo-two-dataset-branch',
      heldOutStudyGroups: ['synthetic-contract-fixture-branch'],
      fitStudyGroups: ['synthetic-contract-fixture-sparse', 'synthetic-contract-fixture-linear'],
    })
    const heldIds = ['synthetic_branch_time', 'synthetic_branch_time_sibling']
    assert.deepEqual(
      partition.holdoutDatasets.map((dataset) => dataset.id).sort(),
      heldIds,
    )
    assert.equal(partition.fitView.datasets.some((dataset) => heldIds.includes(dataset.id)), false)
    assert.equal(
      partition.fitView.observations.some((row) => heldIds.includes(canonicalDatasetId(catalog, row.datasetId))),
      false,
    )
    assert.equal(
      heldIds.every((id) => partition.holdoutObservations.some((row) => canonicalDatasetId(catalog, row.datasetId) === id)),
      true,
    )
  })

  it('does not reintroduce a held-out dataset through an alias', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { partitionFold } = await import('../../validation/src/holdout.ts')
    const catalog = await loadRouterCatalog()
    const branch = catalog.datasets.find((dataset) => dataset.id === 'synthetic_branch_time')
    if (!branch) throw new Error('missing branch dataset')
    const alias = branch.aliases[0]
    const sneaky = {
      ...structuredClone(catalog.observations.find((row) => row.datasetId === branch.id)!),
      datasetId: alias,
    }
    const leaked = {
      ...catalog,
      observations: [...catalog.observations, sneaky],
    }
    const partition = partitionFold(leaked, {
      id: 'logo-alias-leak',
      heldOutStudyGroups: ['synthetic-contract-fixture-branch'],
      fitStudyGroups: ['synthetic-contract-fixture-sparse', 'synthetic-contract-fixture-linear'],
    })
    assert.equal(
      partition.fitView.observations.some((row) => row.datasetId === alias || row.datasetId === branch.id),
      false,
    )
    assert.equal(
      partition.holdoutObservations.some((row) => row.datasetId === alias),
      true,
    )
  })

  it('rebinds the fit scoring-view digest and scores only held-out observations', async () => {
    const { loadRouterCatalog } = await import('../../validation/src/load-catalog.ts')
    const { partitionFold } = await import('../../validation/src/holdout.ts')
    const catalog = await loadRouterCatalog()
    const partition = partitionFold(catalog, {
      id: 'logo-synthetic-contract-fixture-sparse',
      heldOutStudyGroups: ['synthetic-contract-fixture-sparse'],
      fitStudyGroups: ['synthetic-contract-fixture-branch', 'synthetic-contract-fixture-linear'],
    })
    assert.notEqual(partition.fitView.release.evidenceDigest, catalog.release.evidenceDigest)
    assert.equal(partition.fitView.release.synthetic, true)
    assert.equal(partition.fitView.methods.every((method) => method.executable === true), true)
    const holdoutIds = new Set(partition.holdoutDatasets.map((dataset) => dataset.id))
    assert.equal(
      partition.holdoutObservations.every((row) => holdoutIds.has(canonicalDatasetId(catalog, row.datasetId))),
      true,
    )
    assert.equal(
      partition.fitView.observations.some((row) => holdoutIds.has(canonicalDatasetId(catalog, row.datasetId))),
      false,
    )
  })

  it('does not let baselines call routeMethods', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../../validation/src/baselines.ts'), 'utf8')
    assert.equal(source.includes('routeMethods'), false)
  })

  it('writes one row per fold, dataset, profile, and system', async () => {
    const { evaluateGroupedHoldout } = await import('../../validation/src/holdout.ts')
    const rows = await evaluateGroupedHoldout()
    assert.equal(rows.length, 3 * 1 * 2 * 6)
    assert.deepEqual([...new Set(rows.map((row) => row.system))].sort(), [...SYSTEMS].sort())
    for (const row of rows) {
      assert.equal(typeof row.foldId, 'string')
      assert.equal(typeof row.datasetId, 'string')
      assert.equal(typeof row.profileId, 'string')
      assert.equal(typeof row.seed, 'number')
      assert.equal(typeof row.routerVersion, 'string')
      assert.equal(typeof row.evidenceVersion, 'string')
      assert.ok(SYSTEMS.includes(row.system as typeof SYSTEMS[number]))
      assert.ok(row.profileId === 'quick_trajectory' || row.profileId === 'advanced_trajectory')
    }
  })

  it('marks router refusal as non_evaluable rather than a zero score', async () => {
    const { scoreRecommendation } = await import('../../validation/src/holdout.ts')
    const { NON_EVALUABLE } = await import('../../validation/src/metrics.ts')
    const scored = scoreRecommendation({
      status: 'REFUSED',
      methodId: null,
      ranked: [],
      topThreeRetention: undefined,
    }, {
      utilities: [{ methodId: 'oracle', utility: 1 }],
      frontier: ['oracle'],
      maxResourceTier: 2,
      resourceTier: undefined,
    })
    assert.equal(scored.top1, NON_EVALUABLE)
    assert.equal(scored.normalizedRegret, NON_EVALUABLE)
    assert.notEqual(scored.top1, 0)
    assert.notEqual(scored.normalizedRegret, 0)
  })

  it('bootstraps study groups rather than rows', async () => {
    const { bootstrapStudyGroups } = await import('../../validation/src/bootstrap-ci.ts')
    const rows = [
      ...Array.from({ length: 100 }, () => ({ studyGroup: 'A', value: 1 })),
      { studyGroup: 'B', value: 0 },
    ]
    const summary = bootstrapStudyGroups(rows, { replicates: 5000, seed: 20260823 })
    assert.equal(summary.studyCount, 2)
    assert.equal(summary.evaluableTaskCount, 101)
    assert.equal(typeof summary.mean === 'number' && summary.mean < 0.9, true)
    assert.equal(summary.p2_5, 0)
    const again = bootstrapStudyGroups(rows, { replicates: 5000, seed: 20260823 })
    assert.deepEqual(again, summary)
  })
})
