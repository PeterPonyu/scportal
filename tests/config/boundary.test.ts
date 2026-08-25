import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const root = new URL('../..', import.meta.url)
const allowedInternalImporter = 'app/core/config/compiler.ts'

function files(directory: string): string[] {
  return readdirSync(new URL(directory, root), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`])
}

test('production compiler imports preserve the public boundary', () => {
  const offenders = [...files('app'), ...files('scripts')]
    .filter((file) => /\.(?:[cm]?[jt]s|vue)$/.test(file))
    .filter((file) => /from\s+['"][^'"]*(?:config\/internal|compiler-engine)[^'"]*['"]/.test(readFileSync(new URL(file, root), 'utf8')))
    .filter((file) => file !== allowedInternalImporter)
  assert.deepEqual(offenders, [])
})

test('the public compiler exports only compileConfig at runtime', async () => {
  const compiler = await import('../../app/core/config/compiler.ts')
  assert.deepEqual(Object.keys(compiler).sort(), ['compileConfig'])
})
