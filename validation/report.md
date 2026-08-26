# Router validation report

**Banner:** Synthetic evidence cannot support biological or algorithmic-superiority claims.

This is a sealed dry-run of protocol `router-validation-v1` against source release `router-evidence-synthetic-v1`. The machine-readable claim is `software_resource`. Application concordance is not causal discovery.

## Protocol

| Field | Value |
| --- | --- |
| version | router-validation-v1 |
| seed | 20260823 |
| bootstrapReplicates | 5000 |
| routerReplicates | 200 |
| primaryEndpoint | paired_normalized_regret_improvement_vs_global_average |
| routerVersion | router-core-v1 |
| sourceEvidenceReleaseId | router-evidence-synthetic-v1 |
| externalHoldoutDatasetId | gse280270_ucb_tpo |
| claimGate.minimumEvaluableHoldoutTasks | 20 |
| claimGate.minimumStudyGroups | 5 |
| claimGate.regretImprovementCiLowerBound | 0 |
| claimGate.top3NonInferiorityMargin | 0.05 |

Thresholds stay at the frozen floors. They are not relaxed to fit the current catalog.

## Data and study inventory

The current catalog has **3 synthetic study groups**. That is below the frozen minimum of 5 independent study groups.

| studyGroup | datasetId | modality | scale | topology |
| --- | --- | --- | --- | --- |
| synthetic-contract-fixture-branch | synthetic_branch_time | scrna | 10k_50k | bifurcating |
| synthetic-contract-fixture-sparse | synthetic_large_sparse | scrna | 50k_200k | mixed |
| synthetic-contract-fixture-linear | synthetic_linear_small | scrna | lt_10k | linear |

Leave-one-study-group-out folds:

- `logo-synthetic-contract-fixture-branch` holds out ["synthetic-contract-fixture-branch"]; fits ["synthetic-contract-fixture-sparse","synthetic-contract-fixture-linear"]
- `logo-synthetic-contract-fixture-sparse` holds out ["synthetic-contract-fixture-sparse"]; fits ["synthetic-contract-fixture-branch","synthetic-contract-fixture-linear"]
- `logo-synthetic-contract-fixture-linear` holds out ["synthetic-contract-fixture-linear"]; fits ["synthetic-contract-fixture-branch","synthetic-contract-fixture-sparse"]

Reserved GEO identities are workflow labels only. They are not in-repo matrices and were not downloaded.

## Metrics

Publication metrics stay in the six scientific groups. Undefined values remain `non_evaluable` and are never coerced to 0.

- Primary endpoint: `paired_normalized_regret_improvement_vs_global_average`
- Task metrics: top1, top3, normalizedRegret, spearman, top3Retention, paretoCoverage, resourceFeasible
- Auxiliary calibration: expected calibration error (five bins)
- ARI/NMI remain auxiliary and are not remapped into geometry, continuity, or trajectory

## Five baselines

Context-free systems scored on the same held-out tasks:

- `global_average` mean Top-3: 1; mean normalized regret: 0
- `most_frequent_top` mean Top-3: 1; mean normalized regret: 0
- `context_free_tree` mean Top-3: 1; mean normalized regret: 0.400000
- `weighted_sum` mean Top-3: 1; mean normalized regret: 0
- `random_compatible` mean Top-3: 1; mean normalized regret: 0.600000

Router mean Top-3: non_evaluable; mean normalized regret: non_evaluable.

## Primary effects with confidence intervals

Study-group bootstrap of paired normalized-regret improvement versus `global_average` (seed 20260823, replicates 5000):

| statistic | value |
| --- | --- |
| evaluableTaskCount | 0 |
| studyCount | 3 |
| mean | non_evaluable |
| median | non_evaluable |
| p2_5 | non_evaluable |
| p97_5 | non_evaluable |
| expectedCalibrationError | non_evaluable |

`algorithmic_router` requires evaluableTaskCount ≥ 20, studyCount ≥ 5, and p2_5 > 0. The current synthetic catalog does not meet those floors.

## Expressible ablations

These five ablations are expressible on the landed Router options. Numeric deltas stay `non_evaluable` when the primary paired endpoint is not evaluable.

| id | status | regretDelta |
| --- | --- | --- |
| without_context_similarity | expressible | non_evaluable |
| without_latent_geometry | expressible | non_evaluable |
| without_continuity_trajectory | expressible | non_evaluable |
| without_resource_constraints | expressible | non_evaluable |
| weak_bootstrap | expressible | non_evaluable |

## Unsupported ablations

Unsupported ablations have a reason and **no numeric delta**.

| id | reason |
| --- | --- |
| without_missingness_penalty | Landed RouterOptions cannot disable the missingness penalty; do not invent a ranker fork |
| without_pareto | Landed RouterOptions cannot disable Pareto; do not invent a Pareto-off fork |

## Stability

Seeds: [20260823,20260824,20260825,20260826,20260827]. Weight perturbation fraction: 0.100000.

| check | value |
| --- | --- |
| top3Jaccard.mean | non_evaluable |
| roleRetention.mean | non_evaluable |
| weightPerturbations | 12 group ±fraction rows |

## External UCB holdout

Dataset `gse280270_ucb_tpo` (GSE280270, human UCB TPO-induced megakaryocyte differentiation D0–D14) remains sealed.

| field | value |
| --- | --- |
| evaluable | false |
| reason | `holdout_evidence_missing` |
| score invented | no |
| used for tuning | no |

No GEO/h5ad matrix was opened. No invented UCB observations were scored.

## Config smoke

GPU required: false. Executable failures: 0. Catalog `executable` flags were not flipped.

| methodId | level | ran |
| --- | --- | --- |
| geometry_vae | not_executable | false |
| graph_contrastive | not_executable | false |
| neural_ode | not_executable | false |

## Four bounded cases

These rows are workflow-applicability demonstrations on reserved identities. They do not establish fate, radiation programs, Dapp1 causality, or sleep-deprivation trajectory validation. Hypothesis-generating biological concordance is the ceiling.

| accession | role | biology | outcome | recommended | compiled | geoObservationsAdded |
| --- | --- | --- | --- | --- | --- | --- |
| GSE277292 | application_case | mouse LSK Dapp1 knockout versus wild type | REFUSED / CONFLICTING_REQUIREMENTS | none | false | false |
| GSE278673 | application_case | mouse LSK total-body radiation injury time course | OK | neural_ode | false | false |
| GSE280145 | supplemental_case | sleep-deprivation stress, non-trajectory supplemental case | OK | graph_contrastive | false | false |
| GSE280270 | external_holdout | human UCB TPO-induced megakaryocyte differentiation D0-D14 | OK | graph_contrastive | false | false |

Allowed wording: workflow applicability; method-selection recommendation; published case evidence; hypothesis-generating biological concordance.

Blocked biological-overclaim sentences are listed in `validation/nonclaims.json` and must not appear in this report.

## Limitations

- Source release `router-evidence-synthetic-v1` is synthetic: true. Synthetic contract fixture only. It contains no published benchmark or biological evidence and must not support scientific claims.
- Three synthetic study groups cannot satisfy the frozen five-group floor.
- Primary paired regret is `non_evaluable` on this catalog (0 evaluable holdout tasks in the sealed dry-run).
- External UCB evidence is missing by design; the holdout was not used to tune the protocol.
- Expressible ablation numeric deltas are `non_evaluable`; unsupported ablations contribute no delta.
- Case outcomes use the synthetic scoring view. They are not published-evidence scores and not causal results.
- `software_resource` is the required claim until a later published-evidence plan meets the frozen gate.

## Claim status

| field | value |
| --- | --- |
| status | `software_resource` |
| passed | false |
| protocolVersion | router-validation-v1 |
| routerVersion | router-core-v1 |
| evidenceVersion | router-evidence-synthetic-v1 |
| evaluatedAt | 2026-08-26T01:26:33.664Z |

Reasons:

- insufficient evaluable holdout tasks: 0 < 20
- insufficient study groups: 3 < 5
- 95% CI lower bound p2_5 is not greater than 0
- Top-3 hit rate is non-evaluable against context-free baselines
- external holdout is missing or not evaluable
- synthetic source release cannot support an algorithmic_router claim

UI and manuscript wording must read `validation/results/claim-status.json` from this frozen release. Do not claim superior recommendation performance.

## Reproduction commands

```bash
npm run validate:protocol
npm run test:validation
npm run validate:primary
node --experimental-strip-types validation/run-ablations.ts
node --experimental-strip-types validation/run-external-holdout.ts
node --experimental-strip-types validation/run-cases.ts
node --experimental-strip-types validation/config-smoke/check-configs.ts
npm run validate:claim
npm run report:validation
npm run build:validation-assets
```

Equivalent composed gate:

```bash
npm run validate:publication
```

`validate:publication` is the local evidence gate. It is not part of `npm run check`.
