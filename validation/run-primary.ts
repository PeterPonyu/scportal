import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bootstrapStudyGroups } from './src/bootstrap-ci.ts'
import { evaluateGroupedHoldout } from './src/holdout.ts'
import { expectedCalibrationError, NON_EVALUABLE } from './src/metrics.ts'

export async function runPrimary() {
  const rows = await evaluateGroupedHoldout()
  const router = rows.filter((row) => row.system === 'router')
  const baseline = rows.filter((row) => row.system === 'global_average')
  const paired = router.map((row) => {
    const match = baseline.find((candidate) => (
      candidate.foldId === row.foldId
      && candidate.datasetId === row.datasetId
      && candidate.profileId === row.profileId
    ))
    const routerRegret = row.metrics.normalizedRegret
    const baselineRegret = match?.metrics.normalizedRegret
    return {
      studyGroup: row.studyGroup,
      value: typeof routerRegret === 'number' && typeof baselineRegret === 'number'
        ? baselineRegret - routerRegret
        : NON_EVALUABLE,
    }
  })
  const calibrationItems = router.flatMap((row) => (
    typeof row.metrics.top1 === 'number' && typeof row.metrics.top3Retention === 'number'
      ? [{ confidence: row.metrics.top3Retention, correct: row.metrics.top1 === 1 }]
      : []
  ))
  const result = {
    synthetic: true,
    protocolVersion: 'router-validation-v1',
    routerVersion: 'router-core-v1',
    seed: 20260823,
    generatedAt: new Date().toISOString(),
    rows,
    aggregates: {
      paired_normalized_regret_improvement_vs_global_average: bootstrapStudyGroups(paired, {
        replicates: 5000,
        seed: 20260823,
      }),
      expectedCalibrationError: expectedCalibrationError(calibrationItems, 5),
    },
  }
  const directory = resolve(import.meta.dirname, 'results')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'primary.json'), `${JSON.stringify(result, null, 2)}\n`)
  return result
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runPrimary()
}
