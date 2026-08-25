import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { scanRouterBoundaries } from '../../scripts/check_router_boundaries.mjs'

async function scan(files: Record<string, string>): Promise<string[]> {
  const directory = await mkdtemp(join(tmpdir(), 'scportal-router-boundaries-'))
  try {
    await Promise.all(Object.entries(files).map(async ([name, source]) => {
      const file = join(directory, name)
      await mkdir(join(file, '..'), { recursive: true })
      await writeFile(file, source, 'utf8')
    }))
    return scanRouterBoundaries(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function core(file: string): string {
  return `app/core/router/${file}`
}

test('allows yaml only as the exact pure config serialization adapter', async () => {
  const allowed = await scan({
    'app/core/config/serialize.ts': "import { stringify } from 'yaml'\nexport const yaml = stringify({ value: 1 })\n",
  })
  const rejected = await scan({
    [core('other.ts')]: "import { stringify } from 'yaml'\nexport const yaml = stringify({ value: 1 })\n",
  })
  const rejectedFromAdapterFile = await scan({
    'app/core/config/serialize.ts': "import Vue from 'vue'\nexport { Vue }\n",
  })

  assert.deepEqual(allowed, [])
  assert.deepEqual(rejected, [
    'app/core/router/other.ts:1:1 forbidden module specifier: yaml',
  ])
  assert.deepEqual(rejectedFromAdapterFile, [
    'app/core/config/serialize.ts:1:1 forbidden module specifier: vue',
  ])
})

test('allows relative TypeScript dependencies and runtime shadowing while type-only names do not mask globals', async () => {
  const findings = await scan({
    [core('dep.ts')]: 'export const value = 1\n',
    [core('allowed.ts')]: [
      "import { value } from './dep.ts'",
      'type window = { ignored: true }',
      'const beforeHoist = window',
      'var window = 4',
      'function local(window: number, document: number, fetch: number) { return window + document + fetch + value }',
      'namespace Function { export const local = 1 }',
      'const result = local(1, 2, 3)',
      'export { result }',
    ].join('\n'),
    [core('type-only.ts')]: [
      'type window = { ignored: true }',
      'export const value = window.location',
    ].join('\n'),
  })

  assert.deepEqual(findings, [
    'app/core/router/type-only.ts:2:22 forbidden unshadowed global: window',
  ])
})

test('rejects static, dynamic, require, and global bypasses with code-unit sorted findings', async () => {
  const findings = await scan({
    [core('a.ts')]: [
      "import vue from 'vue'",
      "export * from '../../outside.ts'",
      'const r = require',
      "const loaded = require('./dep.ts')",
      'const dynamic = import(name)',
      'globalThis.fetch(\'/api\')',
      'eval(\'1\')',
      'new Function(\'return 1\')',
    ].join('\n'),
    [core('dep.ts')]: 'export const dep = 1\n',
    [core('z.ts')]: 'const require = () => 1\n',
  })

  assert.deepEqual(findings, [
    "app/core/router/a.ts:1:1 forbidden module specifier: vue",
    "app/core/router/a.ts:2:1 dependency escapes app/core: ../../outside.ts",
    'app/core/router/a.ts:3:11 forbidden unshadowed global: require',
    'app/core/router/a.ts:4:16 direct require is forbidden',
    'app/core/router/a.ts:5:17 nonliteral dynamic import is forbidden',
    'app/core/router/a.ts:6:1 forbidden unshadowed global: globalThis',
    'app/core/router/a.ts:7:1 forbidden unshadowed global: eval',
    'app/core/router/a.ts:8:5 forbidden unshadowed global: Function',
    'app/core/router/z.ts:1:7 local require binding is forbidden',
  ])
})

test('rejects parse diagnostics and TypeScript-only grammar in JavaScript modules', async () => {
  const findings = await scan({
    [core('broken.js')]: 'export const = 1\n',
    [core('typed.js')]: 'const value: number = 1\n',
  })

  assert.ok(findings.some((item) => /parse diagnostic/.test(item)))
  assert.ok(findings.some((item) => /TypeScript-only syntax in JavaScript module/.test(item)))
})

test('rejects every external-module import-equals dependency including relative targets', async () => {
  const findings = await scan({
    [core('dep.ts')]: 'export const value = 1\n',
    [core('import-equals.ts')]: [
      "import Fs = require('node:fs')",
      "import Vue = require('vue')",
      "import Package = require('package-name')",
      "import Relative = require('./dep.ts')",
    ].join('\n'),
  })

  assert.deepEqual(findings, [
    'app/core/router/import-equals.ts:1:1 direct require is forbidden',
    'app/core/router/import-equals.ts:1:1 forbidden module specifier: node:fs',
    'app/core/router/import-equals.ts:2:1 direct require is forbidden',
    'app/core/router/import-equals.ts:2:1 forbidden module specifier: vue',
    'app/core/router/import-equals.ts:3:1 direct require is forbidden',
    'app/core/router/import-equals.ts:3:1 forbidden module specifier: package-name',
    'app/core/router/import-equals.ts:4:1 direct require is forbidden',
  ])
})
