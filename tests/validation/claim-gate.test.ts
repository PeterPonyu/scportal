import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const FROZEN = {
  regretImprovementCiLowerBound: 0,
  minimumEvaluableHoldoutTasks: 20,
  minimumStudyGroups: 5,
  top3NonInferiorityMargin: 0.05,
} as const

const BASELINES = [
  'global_average',
  'most_frequent_top',
  'context_free_tree',
  'weighted_sum',
  'random_compatible',
] as const

const CASE_IDS = [
  'gse280270_ucb_tpo',
  'gse277292_dapp1',
  'gse278673_radiation',
  'gse280145_sleep_deprivation',
] as const

function protocol(overrides: Record<string, unknown> = {}) {
  return {
    version: 'router-validation-v1',
    routerVersion: 'router-core-v1',
    sourceEvidenceReleaseId: 'router-evidence-v1',
    claimGate: { ...FROZEN },
    ...overrides,
  }
}

function row(input: {
  system: string
  studyGroup: string
  datasetId: string
  top3: number
  regret: number
}) {
  return {
    foldId: `logo-${input.studyGroup}`,
    datasetId: input.datasetId,
    studyGroup: input.studyGroup,
    profileId: 'quick_trajectory',
    system: input.system,
    status: 'OK',
    methodId: 'graph_contrastive',
    metrics: { top3: input.top3, normalizedRegret: input.regret },
  }
}

function primaryRows(options: {
  studyGroups: number
  tasksPerGroup: number
  routerTop3: number
  baselineTop3: number
  routerRegret: number
  baselineRegret: number
}) {
  const rows = []
  for (let study = 0; study < options.studyGroups; study += 1) {
    const studyGroup = `published-study-${study + 1}`
    for (let task = 0; task < options.tasksPerGroup; task += 1) {
      const datasetId = `${studyGroup}-task-${task + 1}`
      rows.push(row({
        system: 'router',
        studyGroup,
        datasetId,
        top3: options.routerTop3,
        regret: options.routerRegret,
      }))
      for (const system of BASELINES) {
        rows.push(row({
          system,
          studyGroup,
          datasetId,
          top3: options.baselineTop3,
          regret: options.baselineRegret,
        }))
      }
    }
  }
  return rows
}

function passingPrimary(overrides: Record<string, unknown> = {}) {
  const studyGroups = 5
  const tasksPerGroup = 4
  return {
    synthetic: false,
    protocolVersion: 'router-validation-v1',
    routerVersion: 'router-core-v1',
    evidenceVersion: 'router-evidence-v1',
    rows: primaryRows({
      studyGroups,
      tasksPerGroup,
      routerTop3: 0.9,
      baselineTop3: 0.85,
      routerRegret: 0.1,
      baselineRegret: 0.3,
    }),
    aggregates: {
      paired_normalized_regret_improvement_vs_global_average: {
        evaluableTaskCount: studyGroups * tasksPerGroup,
        studyCount: studyGroups,
        p2_5: 0.08,
        p97_5: 0.28,
        median: 0.18,
        mean: 0.19,
        replicates: 5000,
        seed: 20260823,
      },
    },
    ...overrides,
  }
}

function passingBundle(overrides: Record<string, unknown> = {}) {
  return {
    protocol: protocol(),
    primary: passingPrimary(),
    external: { evaluable: true, datasetId: 'gse280270_ucb_tpo' },
    configSmoke: { executableFailures: 0, rows: [] },
    release: { id: 'router-evidence-v1', synthetic: false },
    ablations: {
      ablations: [
        { id: 'without_context_similarity', status: 'expressible', regretDelta: 0.01 },
        { id: 'without_missingness_penalty', status: 'unsupported', reason: 'unsupported' },
      ],
    },
    cases: CASE_IDS.map((id) => ({ id, accession: id.split('_')[0].toUpperCase() })),
    ...overrides,
  }
}

function currentCatalogBundle(overrides: Record<string, unknown> = {}) {
  return {
    protocol: protocol({ sourceEvidenceReleaseId: 'router-evidence-synthetic-v1' }),
    primary: {
      synthetic: true,
      protocolVersion: 'router-validation-v1',
      routerVersion: 'router-core-v1',
      evidenceVersion: 'router-evidence-synthetic-v1',
      rows: [],
      aggregates: {
        paired_normalized_regret_improvement_vs_global_average: {
          evaluableTaskCount: 0,
          studyCount: 3,
          p2_5: 'non_evaluable',
          p97_5: 'non_evaluable',
          median: 'non_evaluable',
          mean: 'non_evaluable',
          replicates: 5000,
          seed: 20260823,
        },
      },
    },
    external: {
      evaluable: false,
      reason: 'holdout_evidence_missing',
      datasetId: 'gse280270_ucb_tpo',
    },
    configSmoke: { executableFailures: 0, rows: [] },
    release: { id: 'router-evidence-synthetic-v1', synthetic: true },
    ablations: { ablations: [] },
    cases: CASE_IDS.map((id) => ({ id })),
    ...overrides,
  }
}

describe('fail-closed claim gate', () => {
  it('upgrades only a published fixture that meets every frozen threshold', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle())
    assert.equal(status.status, 'algorithmic_router')
    assert.equal(status.passed, true)
    assert.deepEqual(status.reasons, [])
    assert.equal(status.protocolVersion, 'router-validation-v1')
    assert.equal(status.routerVersion, 'router-core-v1')
    assert.equal(status.evidenceVersion, 'router-evidence-v1')
    assert.equal(Number.isNaN(Date.parse(status.evaluatedAt)), false)
  })

  it('downgrades fewer than 20 evaluable holdout tasks', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      primary: passingPrimary({
        rows: primaryRows({
          studyGroups: 5,
          tasksPerGroup: 3,
          routerTop3: 0.9,
          baselineTop3: 0.85,
          routerRegret: 0.1,
          baselineRegret: 0.3,
        }),
        aggregates: {
          paired_normalized_regret_improvement_vs_global_average: {
            evaluableTaskCount: 15,
            studyCount: 5,
            p2_5: 0.08,
            p97_5: 0.28,
            median: 0.18,
            mean: 0.19,
            replicates: 5000,
            seed: 20260823,
          },
        },
      }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.equal(status.passed, false)
    assert.match(status.reasons.join('\n'), /20|evaluable/i)
  })

  it('downgrades fewer than 5 study groups', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      primary: passingPrimary({
        rows: primaryRows({
          studyGroups: 4,
          tasksPerGroup: 5,
          routerTop3: 0.9,
          baselineTop3: 0.85,
          routerRegret: 0.1,
          baselineRegret: 0.3,
        }),
        aggregates: {
          paired_normalized_regret_improvement_vs_global_average: {
            evaluableTaskCount: 20,
            studyCount: 4,
            p2_5: 0.08,
            p97_5: 0.28,
            median: 0.18,
            mean: 0.19,
            replicates: 5000,
            seed: 20260823,
          },
        },
      }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /5|study/i)
  })

  it('downgrades a 95% CI lower bound that is not greater than 0', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      primary: passingPrimary({
        aggregates: {
          paired_normalized_regret_improvement_vs_global_average: {
            evaluableTaskCount: 20,
            studyCount: 5,
            p2_5: 0,
            p97_5: 0.2,
            median: 0.1,
            mean: 0.1,
            replicates: 5000,
            seed: 20260823,
          },
        },
      }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /ci|lower bound|p2_5/i)
  })

  it('downgrades Top-3 more than 0.05 below the best context-free baseline', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      primary: passingPrimary({
        rows: primaryRows({
          studyGroups: 5,
          tasksPerGroup: 4,
          routerTop3: 0.7,
          baselineTop3: 0.9,
          routerRegret: 0.1,
          baselineRegret: 0.3,
        }),
      }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /top-3|top3|0\.05/i)
  })

  it('downgrades a missing or non-evaluable external holdout', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      external: { evaluable: false, reason: 'holdout_evidence_missing', datasetId: 'gse280270_ucb_tpo' },
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /external|holdout/i)
  })

  it('downgrades executable config-smoke failures', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      configSmoke: { executableFailures: 1, rows: [] },
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /executable|smoke/i)
  })

  it('downgrades a synthetic source release even when numeric gates would pass', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      release: { id: 'router-evidence-synthetic-v1', synthetic: true },
      primary: passingPrimary({ synthetic: true, evidenceVersion: 'router-evidence-synthetic-v1' }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /synthetic/i)
  })

  it('downgrades a missing required artifact', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const bundle = passingBundle()
    delete (bundle as { primary?: unknown }).primary
    const status = evaluateClaim(bundle)
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /missing|primary/i)
  })

  it('downgrades a schema error in the primary aggregates', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(passingBundle({
      primary: { synthetic: false, protocolVersion: 'router-validation-v1' },
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /schema|aggregate/i)
  })

  it('yields software_resource for the current three-group synthetic catalog', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(currentCatalogBundle())
    assert.equal(status.status, 'software_resource')
    assert.equal(status.passed, false)
    assert.equal(status.evidenceVersion, 'router-evidence-synthetic-v1')
    const reasons = status.reasons.join('\n')
    assert.match(reasons, /study/i)
    assert.match(reasons, /external|holdout/i)
    assert.match(reasons, /synthetic/i)
  })

  it('refuses to honor loosened protocol thresholds on the current catalog', async () => {
    const { evaluateClaim } = await import('../../validation/src/claim-gate.ts')
    const status = evaluateClaim(currentCatalogBundle({
      protocol: protocol({
        sourceEvidenceReleaseId: 'router-evidence-synthetic-v1',
        claimGate: {
          regretImprovementCiLowerBound: -1,
          minimumEvaluableHoldoutTasks: 0,
          minimumStudyGroups: 3,
          top3NonInferiorityMargin: 1,
        },
      }),
    }))
    assert.equal(status.status, 'software_resource')
    assert.match(status.reasons.join('\n'), /synthetic|study|holdout|evaluable/i)
  })
})
