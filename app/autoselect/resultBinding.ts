import type { RouterOutcome, TaskProfile } from '../core/router/types.ts'

export interface BoundRouterRun {
  profile: TaskProfile
  outcome: RouterOutcome
}

export function bindRouterRun(profile: TaskProfile, outcome: RouterOutcome): BoundRouterRun {
  return { profile, outcome }
}

export function boundRunFromWorkerState(state: {
  outcome: RouterOutcome | null
  submittedProfile: TaskProfile | null
}): BoundRouterRun | null {
  if (!state.outcome || !state.submittedProfile) return null
  return bindRouterRun(state.submittedProfile, state.outcome)
}

export function taskProfilesEqual(left: TaskProfile, right: TaskProfile): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function currentBoundOutcome(
  snapshot: BoundRouterRun | null | undefined,
  liveProfile: TaskProfile | null | undefined,
): RouterOutcome | null {
  if (!snapshot || !liveProfile) return null
  return taskProfilesEqual(snapshot.profile, liveProfile) ? snapshot.outcome : null
}

export function currentBoundProfile(
  snapshot: BoundRouterRun | null | undefined,
  liveProfile: TaskProfile | null | undefined,
): TaskProfile | null {
  if (!snapshot || !liveProfile) return null
  return taskProfilesEqual(snapshot.profile, liveProfile) ? snapshot.profile : null
}

export function isBoundRunStale(
  snapshot: BoundRouterRun | null | undefined,
  liveProfile: TaskProfile | null | undefined,
): boolean {
  return Boolean(snapshot) && currentBoundOutcome(snapshot, liveProfile) === null
}
