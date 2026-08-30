import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('CODE author template declares the package interface exposed by its pinned source tree', async () => {
  const records = JSON.parse(await readFile(new URL('../../data/router/author/config-templates.json', import.meta.url), 'utf8')) as Array<{
    methodId: string
    template: {
      packageVersion: string
      importName: string
      constructor: string
      wrapper: {
        style?: string
        fitMethod: string
        input: string
        fitParameters?: string[]
        resultGetters?: Record<string, string>
        resultAttributes?: Record<string, string>
        metadataSource?: string
      }
    }
  }>
  const code = records.find((record) => record.methodId === 'CODE')
  assert.ok(code)
  assert.equal(code.template.packageVersion, '0.1.0')
  assert.equal(code.template.importName, 'CODE')
  assert.equal(code.template.constructor, 'Agent')
  assert.deepEqual(code.template.wrapper, {
    style: 'constructor_fit_getter',
    fitMethod: 'fit',
    input: 'adata',
    fitParameters: ['epochs'],
    resultGetters: { latent: 'get_latent' },
    metadataSource: 'router',
  })
})

test('LAIOR author template declares its constructor-fit-getter interface', async () => {
  const records = JSON.parse(await readFile(new URL('../../data/router/author/config-templates.json', import.meta.url), 'utf8')) as Array<{
    methodId: string
    template: {
      packageVersion: string
      importName: string
      constructor: string
      wrapper: Record<string, unknown>
    }
  }>
  const laior = records.find((record) => record.methodId === 'LAIOR')
  assert.ok(laior)
  assert.equal(laior.template.packageVersion, '0.6.0')
  assert.equal(laior.template.importName, 'laior')
  assert.equal(laior.template.constructor, 'LAIOR')
  assert.deepEqual(laior.template.wrapper, {
    style: 'constructor_fit_getter',
    fitMethod: 'fit',
    input: 'adata',
    fitParameters: ['epochs'],
    resultGetters: { latent: 'get_latent' },
    metadataSource: 'router',
  })
})

test('GNODEVAE author template selects the documented subgraph constructor shape', async () => {
  const records = JSON.parse(await readFile(new URL('../../data/router/author/config-templates.json', import.meta.url), 'utf8')) as Array<{
    methodId: string
    template: {
      packageVersion: string
      importName: string
      constructor: string
      wrapper: Record<string, unknown>
    }
  }>
  const gnodevae = records.find((record) => record.methodId === 'GNODEVAE')
  assert.ok(gnodevae)
  assert.equal(gnodevae.template.packageVersion, '0.0.3')
  assert.equal(gnodevae.template.importName, 'GNODEVAE')
  assert.equal(gnodevae.template.constructor, 'GNODEVAE_agent_subgraph')
  assert.deepEqual(gnodevae.template.wrapper, {
    style: 'constructor_fit_getter',
    fitMethod: 'fit',
    input: 'adata',
    fitParameters: ['epochs'],
    resultGetters: { latent: 'get_latent' },
    metadataSource: 'router',
  })
})
