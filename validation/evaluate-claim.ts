import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateClaim, type ClaimEvidenceBundle, type ClaimStatus } from './src/claim-gate.ts'

const root = resolve(import.meta.dirname)

async function readJsonOptional(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return undefined
    }
    if (error instanceof SyntaxError) {
      return { __schemaError: error.message }
    }
    throw error
  }
}

async function loadCases(): Promise<unknown> {
  const directory = resolve(root, 'results/cases')
  try {
    const names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort()
    const rows = []
    for (const name of names) {
      rows.push(await readJsonOptional(resolve(directory, name)))
    }
    return { rows }
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ENOENT') {
      return undefined
    }
    throw error
  }
}

export async function loadClaimBundle(): Promise<ClaimEvidenceBundle> {
  return {
    protocol: await readJsonOptional(resolve(root, 'protocol.json')),
    primary: await readJsonOptional(resolve(root, 'results/primary.json')),
    external: await readJsonOptional(resolve(root, 'results/external-holdout.json')),
    configSmoke: await readJsonOptional(resolve(root, 'results/config-smoke.json')),
    release: await readJsonOptional(resolve(root, '../data/router/release.json')),
    ablations: await readJsonOptional(resolve(root, 'results/ablations.json')),
    cases: await loadCases(),
  }
}

export async function runEvaluateClaim(): Promise<ClaimStatus> {
  const status = evaluateClaim(await loadClaimBundle())
  const directory = resolve(root, 'results')
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'claim-status.json'), `${JSON.stringify(status, null, 2)}\n`)
  return status
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  const status = await runEvaluateClaim()
  console.log(status.status)
}
