export type Modality = 'scrna' | 'scatac' | 'multiome'
export type ScaleBand = 'lt_10k' | '10k_50k' | '50k_200k' | 'gt_200k' | 'unknown'
export type TaskGoal = 'latent_representation' | 'trajectory_reconstruction' | 'fate_decision' | 'lineage_contribution'
export type Topology = 'linear' | 'bifurcating' | 'multibranch' | 'cyclic' | 'mixed' | 'unknown'
export type PriorKey = 'time' | 'root_state' | 'terminal_states' | 'labels' | 'perturbation'
export type MetricDirection = 'higher_is_better' | 'lower_is_better'
export type MetricGroup = 'latent_geometry' | 'continuity' | 'trajectory' | 'stability' | 'biology' | 'resources'
export type RecommendationRole = 'best_fit' | 'robust_alternative' | 'resource_aware'
export type RefusalCode = 'NO_COMPATIBLE_METHOD' | 'INSUFFICIENT_EVIDENCE' | 'UNSTABLE_TOP_THREE' | 'CRITICAL_COVERAGE_GAP' | 'CONFLICTING_REQUIREMENTS'

export interface DatasetContext {
  id: string
  aliases: string[]
  studyGroup: string
  modality: Modality
  scale: ScaleBand
  topology: Topology
  priors: Partial<Record<PriorKey, boolean>>
  perturbation: boolean | 'unknown'
}

export interface MethodCapability {
  id: string
  aliases: string[]
  version: string
  modalities: Modality[]
  maxScale: Exclude<ScaleBand, 'unknown'>
  outputs: Array<'latent' | 'graph' | 'pseudotime' | 'branch' | 'metadata'>
  requiredPriors: PriorKey[]
  supportedGoals: TaskGoal[]
  resourceTier: 1 | 2 | 3
  installCommand: string
  license: string
  sourceUrl: string
  docsUrl: string
  paperUrl: string
  executable: boolean
}

export interface MetricDefinition {
  id: string
  aliases: string[]
  group: MetricGroup
  direction: MetricDirection
  auxiliary: boolean
  description: string
}

export interface EvidenceProvenance {
  paperId: string
  locator: string
  datasetVersion: string
  methodVersion: string
  runConfigId: string
  extractedAt: string
}

export interface BenchmarkObservation {
  datasetId: string
  methodId: string
  metricId: string
  rawValue: number
  provenance: EvidenceProvenance
}

export interface TaskProfile {
  id: string
  modality: Modality
  scale: ScaleBand
  goals: TaskGoal[]
  topology: Topology
  priors: Partial<Record<PriorKey, boolean | 'unknown'>>
  perturbation: boolean | 'unknown'
  weights: Record<MetricGroup, number>
  maxResourceTier: 1 | 2 | 3
  minEffectiveDatasets: number
  minCriticalCoverage: number
  seed: number
  candidateMethodIds?: string[]
}

export interface EvidenceRelease {
  id: string
  synthetic: boolean
  description: string
  configDigest: string
  evidenceDigest: string
}

export interface RouterReceipt {
  profileFingerprint: string
  release: EvidenceRelease
}

export interface RouterInput {
  profile: TaskProfile
  datasets: DatasetContext[]
  methods: MethodCapability[]
  metrics: MetricDefinition[]
  observations: BenchmarkObservation[]
  routerVersion: string
  release: EvidenceRelease
}

export interface RouterOptions {
  contextFeatureWeights?: {
    modality: number
    scale: number
    topology: number
    priors: number
    perturbation: number
  }
  shrinkageAlpha?: number
  bootstrapReplicates?: number
  outrankingDelta?: number
  minimumTopThreeRetention?: number
}

export interface EvidenceStatement {
  text: string
  group: MetricGroup
  score: number
  baseline: number
  contribution: number
  direction: 'supports'
  metricIds: string[]
  datasetIds: string[]
  synthetic: boolean
}

export interface AlternativeDisposition {
  methodId: string
  status: 'recommended_alternative' | 'compatible_unselected' | 'excluded'
  reasons: string[]
}

export interface EvidenceLink {
  paperId: string
  locator: string
  datasetId: string
  metricId: string
  datasetVersion: string
  methodVersion: string
  runConfigId: string
  extractedAt: string
  synthetic: boolean
}

export interface Recommendation {
  methodId: string
  roles: RecommendationRole[]
  paretoLayer: number
  outrankingFlow: number
  conservativeUtility: number
  confidence: 'high' | 'medium' | 'low'
  topThreeRetention: number
  effectiveDatasets: number
  criticalCoverage: number
  positiveEvidence: string[]
  positiveEvidenceDetails: EvidenceStatement[]
  evidenceLinks: EvidenceLink[]
  confidenceReasons: string[]
  limitations: string[]
  alternativeDispositions: AlternativeDisposition[]
  excludedAlternatives: import('./constraints.ts').Exclusion[]
}

export type RouterOutcome =
  | { status: 'OK'; recommendations: Recommendation[]; seed: number; evidenceVersion: string; routerVersion: string; receipt: RouterReceipt }
  | { status: 'REFUSED'; code: RefusalCode; candidates: string[]; evidenceGaps: string[]; seed: number; evidenceVersion: string; routerVersion: string }
