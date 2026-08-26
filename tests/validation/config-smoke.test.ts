import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const CATALOG_IDS = ['geometry_vae', 'graph_contrastive', 'neural_ode'] as const

async function readJson(relative: string) {
  return JSON.parse(await readFile(resolve(root, relative), 'utf8'))
}

describe('config smoke against a non-executable catalog', () => {
  it('lists every catalog method exactly once in the smoke matrix', async () => {
    const catalog = await readJson('data/router/methods.json') as Array<{ id: string; executable: boolean }>
    const matrix = await readJson('validation/config-smoke/matrix.json') as {
      gpuRequired: boolean
      methods: Array<{ id: string; level: string }>
    }
    const catalogIds = catalog.map((method) => method.id)
    const matrixIds = matrix.methods.map((row) => row.id)
    assert.deepEqual(catalogIds, [...CATALOG_IDS])
    assert.deepEqual(matrixIds, catalogIds)
    assert.equal(new Set(matrixIds).size, matrixIds.length)
    assert.equal(catalog.every((method) => method.executable === false), true)
    assert.equal(matrix.gpuRequired, false)
    assert.equal(matrix.methods.every((row) => row.level === 'not_executable'), true)
  })

  it('writes one not_executable row per catalog method and passes with executableFailures 0', async () => {
    const { checkConfigs } = await import('../../validation/config-smoke/check-configs.ts')
    const catalog = await readJson('data/router/methods.json') as Array<{ id: string; executable: boolean }>
    const result = await checkConfigs()
    const ids = result.rows.map((row: { methodId: string }) => row.methodId)
    assert.deepEqual(ids, catalog.map((method) => method.id))
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(result.rows.length, catalog.length)
    assert.equal(result.executableFailures, 0)
    assert.equal(result.gpuRequired, false)
    for (const row of result.rows) {
      assert.equal(row.level, 'not_executable')
      assert.equal(row.ran, false)
    }
    const written = await readJson('validation/results/config-smoke.json')
    assert.deepEqual(written.rows, result.rows)
    assert.equal(written.executableFailures, 0)
  })

  it('requires python_parse on compileConfig output when a method is executable', async () => {
    const { requiredSmokeLevel, pythonParseCompiled } = await import('../../validation/config-smoke/check-configs.ts')
    const { fixtureCompiler, fixtureInput } = await import('../config/helpers/compiler.ts')
    assert.equal(requiredSmokeLevel({ executable: false }), 'not_executable')
    assert.equal(requiredSmokeLevel({ executable: true }), 'python_parse')
    const artifacts = fixtureCompiler(fixtureInput())
    await pythonParseCompiled(artifacts)
    await assert.rejects(
      () => pythonParseCompiled({ pythonSnippet: 'def broken(:\n', filenames: { python: 'broken.py' } }),
      /py_compile|SyntaxError|invalid syntax/i,
    )
  })

  it('does not download GEO, require GPU, or call a training API', async () => {
    const source = await readFile(resolve(root, 'validation/config-smoke/check-configs.ts'), 'utf8')
    const matrix = await readJson('validation/config-smoke/matrix.json')
    assert.equal(matrix.gpuRequired, false)
    assert.equal(/ncbi\.nlm\.nih\.gov|geo\/query|downloadGEO|h5ad|\bfetch\s*\(|https:\/\/|http:\/\//i.test(source), false)
    assert.equal(/wandb|mlflow|\.fit\(|\.train\(|TrainingAPI|cuda|gpuRequired:\s*true/i.test(source), false)
    assert.match(source, /python3/)
    assert.match(source, /py_compile/)
    assert.match(source, /compileConfig/)
  })

  it('fails an executable method that does not reach python_parse', async () => {
    const { checkConfigs } = await import('../../validation/config-smoke/check-configs.ts')
    const catalog = await readJson('data/router/methods.json') as Array<{ id: string; executable: boolean }>
    const injected = catalog.map((method, index) => (
      index === 0 ? { ...method, executable: true } : method
    ))
    const result = await checkConfigs({ methods: injected, write: false })
    const first = result.rows.find((row: { methodId: string }) => row.methodId === catalog[0].id)
    assert.equal(first.level, 'python_parse')
    assert.equal(result.executableFailures, 1)
    const committed = await readJson('data/router/methods.json') as Array<{ executable: boolean }>
    assert.equal(committed.every((method) => method.executable === false), true)
  })
})
