import { BASELINE_IDS } from './baselines.ts'
import type { ClaimStatus } from './claim-gate.ts'

export interface ReportArtifacts {
  protocol: Record<string, unknown>
  splits: { folds?: Array<{ id?: string; heldOutStudyGroups?: string[]; fitStudyGroups?: string[] }> }
  datasets: Array<{ id: string; studyGroup: string; modality?: string; scale?: string; topology?: string }>
  primary: Record<string, unknown>
  ablations: {
    ablations?: Array<Record<string, unknown>>
    stability?: Record<string, unknown>
  }
  external: Record<string, unknown>
  configSmoke: { executableFailures?: number; gpuRequired?: boolean; rows?: Array<Record<string, unknown>> }
  cases: Array<Record<string, unknown>>
  claim: ClaimStatus
  release: { id?: string; synthetic?: boolean; description?: string }
  nonclaims: { blocked?: string[]; allowed?: string[] }
}

const METRICS = [
  'top1',
  'top3',
  'normalizedRegret',
  'spearman',
  'top3Retention',
  'paretoCoverage',
  'resourceFeasible',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return 'non_evaluable'
  if (typeof value === 'number' && Number.isFinite(value)) return Number.isInteger(value) ? String(value) : value.toFixed(6)
  return String(value)
}

function pairedAggregate(primary: Record<string, unknown>): Record<string, unknown> {
  const aggregates = isRecord(primary.aggregates) ? primary.aggregates : {}
  return isRecord(aggregates.paired_normalized_regret_improvement_vs_global_average)
    ? aggregates.paired_normalized_regret_improvement_vs_global_average
    : {}
}

function studyGroups(datasets: ReportArtifacts['datasets']): string[] {
  return [...new Set(datasets.map((row) => row.studyGroup))].sort()
}

function meanSystemMetric(primary: Record<string, unknown>, system: string, metric: string): string {
  const rows = Array.isArray(primary.rows) ? primary.rows.filter(isRecord) : []
  const values = rows.flatMap((row) => {
    if (row.system !== system) return []
    const metrics = isRecord(row.metrics) ? row.metrics : {}
    return typeof metrics[metric] === 'number' ? [metrics[metric] as number] : []
  })
  if (values.length === 0) return 'non_evaluable'
  return formatValue(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function caseOutcome(row: Record<string, unknown>): string {
  const outcome = isRecord(row.outcome) ? row.outcome : {}
  const status = formatValue(outcome.status)
  const code = typeof outcome.code === 'string' ? ` / ${outcome.code}` : ''
  return `${status}${code}`
}

function caseMethod(row: Record<string, unknown>): string {
  const outcome = isRecord(row.outcome) ? row.outcome : {}
  const recommendations = Array.isArray(outcome.recommendations) ? outcome.recommendations.filter(isRecord) : []
  return typeof recommendations[0]?.methodId === 'string' ? recommendations[0].methodId : 'none'
}

export function renderValidationReport(artifacts: ReportArtifacts): string {
  const paired = pairedAggregate(artifacts.primary)
  const groups = studyGroups(artifacts.datasets)
  const expressible = (artifacts.ablations.ablations ?? []).filter((row) => row.status === 'expressible')
  const unsupported = (artifacts.ablations.ablations ?? []).filter((row) => row.status === 'unsupported')
  const stability = artifacts.ablations.stability ?? {}
  const smokeRows = artifacts.configSmoke.rows ?? []
  const blocked = artifacts.nonclaims.blocked ?? []
  const allowed = artifacts.nonclaims.allowed ?? []

  const markdown = `# Router validation report

**Banner:** Synthetic evidence cannot support biological or algorithmic-superiority claims.

This is a sealed dry-run of protocol \`${formatValue(artifacts.protocol.version)}\` against source release \`${formatValue(artifacts.release.id)}\`. The machine-readable claim is \`${artifacts.claim.status}\`. Application concordance is not causal discovery.

## Protocol

| Field | Value |
| --- | --- |
| version | ${formatValue(artifacts.protocol.version)} |
| seed | ${formatValue(artifacts.protocol.seed)} |
| bootstrapReplicates | ${formatValue(artifacts.protocol.bootstrapReplicates)} |
| routerReplicates | ${formatValue(artifacts.protocol.routerReplicates)} |
| primaryEndpoint | ${formatValue(artifacts.protocol.primaryEndpoint)} |
| routerVersion | ${formatValue(artifacts.protocol.routerVersion)} |
| sourceEvidenceReleaseId | ${formatValue(artifacts.protocol.sourceEvidenceReleaseId)} |
| externalHoldoutDatasetId | ${formatValue(artifacts.protocol.externalHoldoutDatasetId)} |
| claimGate.minimumEvaluableHoldoutTasks | 20 |
| claimGate.minimumStudyGroups | 5 |
| claimGate.regretImprovementCiLowerBound | 0 |
| claimGate.top3NonInferiorityMargin | 0.05 |

Thresholds stay at the frozen floors. They are not relaxed to fit the current catalog.

## Data and study inventory

The current catalog has **${groups.length} synthetic study groups**. That is below the frozen minimum of 5 independent study groups.

| studyGroup | datasetId | modality | scale | topology |
| --- | --- | --- | --- | --- |
${artifacts.datasets.map((row) => `| ${row.studyGroup} | ${row.id} | ${row.modality ?? ''} | ${row.scale ?? ''} | ${row.topology ?? ''} |`).join('\n')}

Leave-one-study-group-out folds:

${(artifacts.splits.folds ?? []).map((fold) => `- \`${fold.id}\` holds out ${JSON.stringify(fold.heldOutStudyGroups ?? [])}; fits ${JSON.stringify(fold.fitStudyGroups ?? [])}`).join('\n')}

Reserved GEO identities are workflow labels only. They are not in-repo matrices and were not downloaded.

## Metrics

Publication metrics stay in the six scientific groups. Undefined values remain \`non_evaluable\` and are never coerced to 0.

- Primary endpoint: \`paired_normalized_regret_improvement_vs_global_average\`
- Task metrics: ${METRICS.join(', ')}
- Auxiliary calibration: expected calibration error (five bins)
- ARI/NMI remain auxiliary and are not remapped into geometry, continuity, or trajectory

## Five baselines

Context-free systems scored on the same held-out tasks:

${BASELINE_IDS.map((id) => `- \`${id}\` mean Top-3: ${meanSystemMetric(artifacts.primary, id, 'top3')}; mean normalized regret: ${meanSystemMetric(artifacts.primary, id, 'normalizedRegret')}`).join('\n')}

Router mean Top-3: ${meanSystemMetric(artifacts.primary, 'router', 'top3')}; mean normalized regret: ${meanSystemMetric(artifacts.primary, 'router', 'normalizedRegret')}.

## Primary effects with confidence intervals

Study-group bootstrap of paired normalized-regret improvement versus \`global_average\` (seed ${formatValue(paired.seed)}, replicates ${formatValue(paired.replicates)}):

| statistic | value |
| --- | --- |
| evaluableTaskCount | ${formatValue(paired.evaluableTaskCount)} |
| studyCount | ${formatValue(paired.studyCount)} |
| mean | ${formatValue(paired.mean)} |
| median | ${formatValue(paired.median)} |
| p2_5 | ${formatValue(paired.p2_5)} |
| p97_5 | ${formatValue(paired.p97_5)} |
| expectedCalibrationError | ${formatValue(isRecord(artifacts.primary.aggregates) ? artifacts.primary.aggregates.expectedCalibrationError : undefined)} |

\`algorithmic_router\` requires evaluableTaskCount ≥ 20, studyCount ≥ 5, and p2_5 > 0. The current synthetic catalog does not meet those floors.

## Expressible ablations

These five ablations are expressible on the landed Router options. Numeric deltas stay \`non_evaluable\` when the primary paired endpoint is not evaluable.

| id | status | regretDelta |
| --- | --- | --- |
${expressible.map((row) => `| ${formatValue(row.id)} | expressible | ${formatValue(row.regretDelta)} |`).join('\n')}

## Unsupported ablations

Unsupported ablations have a reason and **no numeric delta**.

| id | reason |
| --- | --- |
${unsupported.map((row) => `| ${formatValue(row.id)} | ${formatValue(row.reason)} |`).join('\n')}

## Stability

Seeds: ${formatValue(JSON.stringify(stability.seeds ?? []))}. Weight perturbation fraction: ${formatValue(stability.weightPerturbationFraction)}.

| check | value |
| --- | --- |
| top3Jaccard.mean | ${formatValue(isRecord(stability.top3Jaccard) ? stability.top3Jaccard.mean : undefined)} |
| roleRetention.mean | ${formatValue(isRecord(stability.roleRetention) ? stability.roleRetention.mean : undefined)} |
| weightPerturbations | ${Array.isArray(stability.weightPerturbations) ? stability.weightPerturbations.length : 0} group ±fraction rows |

## External UCB holdout

Dataset \`${formatValue(artifacts.external.datasetId)}\` (GSE280270, human UCB TPO-induced megakaryocyte differentiation D0–D14) remains sealed.

| field | value |
| --- | --- |
| evaluable | ${formatValue(artifacts.external.evaluable)} |
| reason | \`holdout_evidence_missing\` |
| score invented | no |
| used for tuning | no |

No GEO/h5ad matrix was opened. No invented UCB observations were scored.

## Config smoke

GPU required: ${formatValue(artifacts.configSmoke.gpuRequired)}. Executable failures: ${formatValue(artifacts.configSmoke.executableFailures)}. Catalog \`executable\` flags were not flipped.

| methodId | level | ran |
| --- | --- | --- |
${smokeRows.map((row) => `| ${formatValue(row.methodId)} | ${formatValue(row.level)} | ${formatValue(row.ran)} |`).join('\n')}

## Four bounded cases

These rows are workflow-applicability demonstrations on reserved identities. They do not establish fate, radiation programs, Dapp1 causality, or sleep-deprivation trajectory validation. Hypothesis-generating biological concordance is the ceiling.

| accession | role | biology | outcome | recommended | compiled | geoObservationsAdded |
| --- | --- | --- | --- | --- | --- | --- |
${artifacts.cases.map((row) => `| ${formatValue(row.accession)} | ${formatValue(row.role)} | ${formatValue(row.biology)} | ${caseOutcome(row)} | ${caseMethod(row)} | ${formatValue(row.compiled)} | ${formatValue(row.geoObservationsAdded)} |`).join('\n')}

Allowed wording: ${allowed.join('; ') || 'workflow applicability; method-selection recommendation; published case evidence; hypothesis-generating biological concordance'}.

Blocked biological-overclaim sentences are listed in \`validation/nonclaims.json\` and must not appear in this report.

## Limitations

- Source release \`${formatValue(artifacts.release.id)}\` is synthetic: ${formatValue(artifacts.release.synthetic)}. ${formatValue(artifacts.release.description)}
- Three synthetic study groups cannot satisfy the frozen five-group floor.
- Primary paired regret is \`non_evaluable\` on this catalog (0 evaluable holdout tasks in the sealed dry-run).
- External UCB evidence is missing by design; the holdout was not used to tune the protocol.
- Expressible ablation numeric deltas are \`non_evaluable\`; unsupported ablations contribute no delta.
- Case outcomes use the synthetic scoring view. They are not published-evidence scores and not causal results.
- \`software_resource\` is the required claim until a later published-evidence plan meets the frozen gate.

## Claim status

| field | value |
| --- | --- |
| status | \`${artifacts.claim.status}\` |
| passed | ${formatValue(artifacts.claim.passed)} |
| protocolVersion | ${artifacts.claim.protocolVersion} |
| routerVersion | ${artifacts.claim.routerVersion} |
| evidenceVersion | ${artifacts.claim.evidenceVersion} |
| evaluatedAt | ${artifacts.claim.evaluatedAt} |

Reasons:

${artifacts.claim.reasons.length > 0 ? artifacts.claim.reasons.map((reason) => `- ${reason}`).join('\n') : '- none'}

UI and manuscript wording must read \`validation/results/claim-status.json\` from this frozen release. Do not claim superior recommendation performance.

## Reproduction commands

\`\`\`bash
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
\`\`\`

Equivalent composed gate:

\`\`\`bash
npm run validate:publication
\`\`\`

\`validate:publication\` is the local evidence gate. It is not part of \`npm run check\`.
`

  for (const phrase of blocked) {
    if (markdown.includes(phrase)) {
      throw new Error(`report contains blocked nonclaim wording: ${phrase}`)
    }
  }
  if (/Router found the true fate|causality established by Router|radiation causes the inferred program|sleep deprivation validates trajectory reconstruction/i.test(markdown)) {
    throw new Error('report converts application concordance into causal discovery')
  }
  return markdown
}
