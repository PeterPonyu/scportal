import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateClaim } from './src/claim-gate.ts'
import { renderValidationReport } from './src/report.ts'
import { loadClaimBundle } from './evaluate-claim.ts'

const root = resolve(import.meta.dirname)

async function readJson<T>(relative: string): Promise<T> {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8')) as T
}

async function loadCases(): Promise<Array<Record<string, unknown>>> {
  const directory = resolve(root, 'results/cases')
  const names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort()
  const rows: Array<Record<string, unknown>> = []
  for (const name of names) {
    rows.push(JSON.parse(await readFile(resolve(directory, name), 'utf8')) as Record<string, unknown>)
  }
  return rows
}

export async function runRenderReport(): Promise<string> {
  const bundle = await loadClaimBundle()
  const claim = JSON.parse(await readFile(resolve(root, 'results/claim-status.json'), 'utf8'))
  const markdown = renderValidationReport({
    protocol: await readJson('protocol.json'),
    splits: await readJson('splits.json'),
    datasets: await readJson('../data/router/datasets.json'),
    primary: await readJson('results/primary.json'),
    ablations: await readJson('results/ablations.json'),
    external: await readJson('results/external-holdout.json'),
    configSmoke: await readJson('results/config-smoke.json'),
    cases: await loadCases(),
    claim: claim.status ? claim : evaluateClaim(bundle),
    release: await readJson('../data/router/release.json'),
    nonclaims: await readJson('nonclaims.json'),
  })
  await writeFile(resolve(root, 'report.md'), markdown.endsWith('\n') ? markdown : `${markdown}\n`)
  return markdown
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runRenderReport()
}
