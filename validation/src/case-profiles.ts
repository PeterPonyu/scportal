import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TaskGoal, TaskProfile, Topology } from '../../app/core/router/types.ts'

export interface Nonclaims {
  blocked: string[]
  allowed: string[]
}

export interface NonclaimScan {
  ok: boolean
  hits: string[]
}

export interface CaseIdentityInput {
  accession: string
  biology: string
  labels?: string[]
  goals?: string[]
  topology?: string
  claim?: string
  claimCeiling?: string
  profile?: Pick<TaskProfile, 'goals' | 'topology'>
}

export interface ReservedCase {
  accession: string
  id: string
  role: 'external_holdout' | 'application_case' | 'supplemental_case'
  biology: string
  claimCeiling: string
  weightsSource: 'quick_trajectory' | 'advanced_trajectory'
  profile: TaskProfile
}

const CLAIM_CEILING = [
  'workflow applicability',
  'method-selection recommendation',
  'hypothesis-generating biological concordance',
].join('; ')

const QUICK_WEIGHTS = {
  latent_geometry: 0.2,
  continuity: 0.25,
  trajectory: 0.3,
  stability: 0.1,
  biology: 0.1,
  resources: 0.05,
} as const

const ADVANCED_WEIGHTS = {
  latent_geometry: 0.15,
  continuity: 0.2,
  trajectory: 0.3,
  stability: 0.1,
  biology: 0.15,
  resources: 0.1,
} as const

function profile(
  id: string,
  goals: TaskGoal[],
  extras: Pick<TaskProfile, 'topology' | 'priors' | 'perturbation'> & { weights: TaskProfile['weights']; maxResourceTier: 1 | 2 | 3 },
): TaskProfile {
  return {
    id,
    modality: 'scrna',
    scale: 'unknown',
    goals,
    topology: extras.topology,
    priors: extras.priors,
    perturbation: extras.perturbation,
    weights: extras.weights,
    maxResourceTier: extras.maxResourceTier,
    minEffectiveDatasets: 2,
    minCriticalCoverage: 0.6,
    seed: 20260823,
  }
}

const CASES: ReservedCase[] = [
  {
    accession: 'GSE280270',
    id: 'gse280270_ucb_tpo',
    role: 'external_holdout',
    biology: 'human UCB TPO-induced megakaryocyte differentiation D0-D14',
    claimCeiling: CLAIM_CEILING,
    weightsSource: 'quick_trajectory',
    profile: profile('gse280270_ucb_tpo', ['trajectory_reconstruction', 'lineage_contribution'], {
      topology: 'unknown',
      priors: { time: true },
      perturbation: false,
      weights: { ...QUICK_WEIGHTS },
      maxResourceTier: 2,
    }),
  },
  {
    accession: 'GSE277292',
    id: 'gse277292_dapp1',
    role: 'application_case',
    biology: 'mouse LSK Dapp1 knockout versus wild type',
    claimCeiling: CLAIM_CEILING,
    weightsSource: 'advanced_trajectory',
    profile: profile('gse277292_dapp1', ['fate_decision', 'lineage_contribution'], {
      topology: 'unknown',
      priors: { perturbation: true, time: false },
      perturbation: true,
      weights: { ...ADVANCED_WEIGHTS },
      maxResourceTier: 3,
    }),
  },
  {
    accession: 'GSE278673',
    id: 'gse278673_radiation',
    role: 'application_case',
    biology: 'mouse LSK total-body radiation injury time course',
    claimCeiling: CLAIM_CEILING,
    weightsSource: 'advanced_trajectory',
    profile: profile('gse278673_radiation', ['trajectory_reconstruction', 'fate_decision'], {
      topology: 'bifurcating',
      priors: { time: true },
      perturbation: true,
      weights: { ...ADVANCED_WEIGHTS },
      maxResourceTier: 3,
    }),
  },
  {
    accession: 'GSE280145',
    id: 'gse280145_sleep_deprivation',
    role: 'supplemental_case',
    biology: 'sleep-deprivation stress, non-trajectory supplemental case',
    claimCeiling: CLAIM_CEILING,
    weightsSource: 'quick_trajectory',
    profile: profile('gse280145_sleep_deprivation', ['latent_representation', 'lineage_contribution'], {
      topology: 'unknown',
      priors: { perturbation: true },
      perturbation: true,
      weights: { ...QUICK_WEIGHTS },
      maxResourceTier: 2,
    }),
  },
]

function identityText(input: CaseIdentityInput): string {
  return [input.biology, input.claim, input.claimCeiling, ...(input.labels ?? [])].filter(Boolean).join(' ')
}

function identityGoals(input: CaseIdentityInput): string[] {
  return input.goals ?? input.profile?.goals ?? []
}

function identityTopology(input: CaseIdentityInput): string | undefined {
  return input.topology ?? input.profile?.topology
}

export function assertAccessionIdentity(input: CaseIdentityInput): void {
  const text = identityText(input)
  if (/new causal experiment/i.test(text)) {
    throw new Error('mislabeled: reserved cases are not a new causal experiment')
  }

  const number = input.accession.replace(/^GSE/i, '')
  if (number === '280270' && /\bradiation\b/i.test(text)) {
    throw new Error('mislabeled accession identity')
  }
  if (number === '277292' && /\bradiation\b/i.test(text)) {
    throw new Error('mislabeled accession identity')
  }
  if (number === '278673' && /chemotherapy|\bIRALL\b/i.test(text)) {
    throw new Error('mislabeled accession identity')
  }
  if (number === '280145') {
    const goals = identityGoals(input)
    const topology = identityTopology(input) as Topology | undefined
    const asTrajectory = (
      /longitudinal differentiation trajectory/i.test(text)
      || goals.includes('trajectory_reconstruction')
      || topology === 'linear'
      || topology === 'bifurcating'
    )
    if (asTrajectory) {
      throw new Error('mislabeled: supplemental case is not a longitudinal differentiation trajectory')
    }
  }
}

export function scanNonclaims(text: string, rules: Nonclaims): NonclaimScan {
  const lower = text.toLowerCase()
  const hits = rules.blocked.filter((phrase) => lower.includes(phrase.toLowerCase()))
  return { ok: hits.length === 0, hits }
}

export function loadNonclaims(): Nonclaims {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, '../nonclaims.json'), 'utf8')) as Nonclaims
}

export function reservedCases(): ReservedCase[] {
  return structuredClone(CASES)
}

export function collectRenderedStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectRenderedStrings)
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectRenderedStrings)
  }
  return []
}
