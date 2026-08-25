import type { MetricGroup, TaskGoal } from '../core/router/types.ts'

export function requiredObservationGroups(goals: TaskGoal[], weights: Record<MetricGroup, number>): MetricGroup[] {
  const mandatory: Record<TaskGoal, MetricGroup[]> = {
    latent_representation: ['latent_geometry'],
    trajectory_reconstruction: ['latent_geometry', 'continuity', 'trajectory'],
    fate_decision: ['trajectory', 'biology'],
    lineage_contribution: ['trajectory', 'biology'],
  }
  const groups = new Set<MetricGroup>()
  for (const goal of goals) for (const group of mandatory[goal]) groups.add(group)
  for (const [group, weight] of Object.entries(weights) as [MetricGroup, number][]) {
    if (weight > 0) groups.add(group)
  }
  return [...groups]
}
