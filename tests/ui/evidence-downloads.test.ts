import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import methodsJson from '../../data/router/methods.json' with { type: 'json' }
import templatesJson from '../../data/router/config-templates.json' with { type: 'json' }
import type { AdapterName, CompiledArtifacts, CompileConfigInput } from '../../app/core/config/types.ts'
import type { EvidenceLink, MethodCapability } from '../../app/core/router/types.ts'
import { fixtureCompiler, fixtureInput, fixtureMethod } from '../config/helpers/compiler.ts'
import {
  canDownload,
  compileIfDownloadable,
  declaredAdapters,
  DEFAULT_ADAPTERS,
  downloadCompiled,
  downloadText,
  groupEvidenceLinks,
} from '../../app/services/download.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const methods = methodsJson as MethodCapability[]

function readSource(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function fakeDownloadIo(options: { click?: () => void } = {}) {
  const clicks: string[] = []
  const blobs: Blob[] = []
  const anchors: Array<{ href: string; download: string; click: () => void }> = []
  let createdUrl = ''
  let revoked = false
  const document = {
    createElement(_tag: string) {
      const anchor = {
        href: '',
        download: '',
        rel: '',
        style: { display: '' },
        click() {
          if (options.click) options.click()
          clicks.push(this.download)
        },
      }
      anchors.push(anchor)
      return anchor
    },
    body: {
      appendChild<T>(node: T): T {
        return node
      },
      removeChild<T>(node: T): T {
        return node
      },
    },
  }
  const URL = {
    createObjectURL(blob: Blob) {
      blobs.push(blob)
      createdUrl = `blob:test-${blobs.length}`
      return createdUrl
    },
    revokeObjectURL(url: string) {
      assert.equal(url, createdUrl)
      revoked = true
    },
  }
  return {
    document: document as unknown as Pick<Document, 'createElement' | 'body'>,
    URL,
    clicks,
    blobs,
    anchors,
    get revoked() {
      return revoked
    },
  }
}

describe('local downloads and provenance', () => {
  it('downloadText uses injected document/URL and revokes in finally', async () => {
    const io = fakeDownloadIo()
    downloadText('geometry_vae.json', '{"ok":true}', 'application/json', io)
    assert.equal(io.clicks.length, 1)
    assert.equal(io.clicks[0], 'geometry_vae.json')
    assert.equal(io.anchors[0]?.download, 'geometry_vae.json')
    assert.equal(io.anchors[0]?.href.startsWith('blob:'), true)
    assert.equal(await io.blobs[0]?.text(), '{"ok":true}')
    assert.equal(io.revoked, true)
  })

  it('revokes the object URL in finally when click throws', () => {
    const io = fakeDownloadIo({
      click() {
        throw new Error('click failed')
      },
    })
    assert.throws(() => downloadText('fail.json', 'nope', 'text/plain', io), /click failed/)
    assert.equal(io.revoked, true)
  })

  it('catalog methods stay non-executable so canDownload is false and compileConfig is not called', () => {
    assert.ok(methods.length > 0)
    for (const method of methods) {
      assert.equal(method.executable, false, `${method.id} must stay executable: false`)
      assert.equal(canDownload(method), false)
    }

    let compileCalls = 0
    const compile = (_input: CompileConfigInput): CompiledArtifacts => {
      compileCalls += 1
      throw new Error('compileConfig must not run for non-executable methods')
    }
    const result = compileIfDownloadable(methods[0]!, fixtureInput(), compile)
    assert.equal(result, null)
    assert.equal(compileCalls, 0)
  })

  it('an executable method double downloads compileConfig artifact filenames and text', async () => {
    const doubled = { ...fixtureMethod, executable: true }
    assert.equal(canDownload(doubled), true)
    const artifacts = fixtureCompiler(fixtureInput())
    let compileCalls = 0
    const compiled = compileIfDownloadable(doubled, fixtureInput(), (input) => {
      compileCalls += 1
      return fixtureCompiler(input)
    })
    assert.equal(compileCalls, 1)
    assert.equal(compiled?.filenames.json, artifacts.filenames.json)
    assert.equal(compiled?.json, artifacts.json)

    for (const kind of ['json', 'yaml', 'python'] as const) {
      const io = fakeDownloadIo()
      downloadCompiled(artifacts, kind, io)
      assert.equal(io.clicks[0], artifacts.filenames[kind === 'python' ? 'python' : kind])
      const expected = kind === 'json' ? artifacts.json : kind === 'yaml' ? artifacts.yaml : artifacts.pythonSnippet
      assert.equal(await io.blobs[0]?.text(), expected)
      assert.equal(io.revoked, true)
    }
  })

  it('adapter checkboxes default to [] and enable only declared scFocus/scRL', () => {
    assert.deepEqual(DEFAULT_ADAPTERS, [])
    const byId = new Map(
      (templatesJson as Array<{ methodId: string; template: { downstream?: { scFocus?: unknown; scRL?: unknown } } }>).map((entry) => [
        entry.methodId,
        entry,
      ]),
    )
    assert.deepEqual(declaredAdapters(byId.get('geometry_vae')), [])
    assert.deepEqual(declaredAdapters(byId.get('graph_contrastive')), ['scFocus'] satisfies AdapterName[])
    assert.deepEqual(declaredAdapters(byId.get('neural_ode')), ['scFocus', 'scRL'] satisfies AdapterName[])
    assert.deepEqual(declaredAdapters({ downstream: {} }), [])
    assert.deepEqual(declaredAdapters(undefined), [])
  })

  it('groups evidenceLinks by paperId + locator + datasetId and keeps synthetic labels', () => {
    const links: EvidenceLink[] = [
      {
        paperId: 'paper-a',
        locator: 'fig:1',
        datasetId: 'ds-1',
        metricId: 'metric-a',
        datasetVersion: '1',
        methodVersion: '1.0.0',
        runConfigId: 'run-1',
        extractedAt: '2026-08-24T00:00:00Z',
        synthetic: true,
      },
      {
        paperId: 'paper-a',
        locator: 'fig:1',
        datasetId: 'ds-1',
        metricId: 'metric-b',
        datasetVersion: '1',
        methodVersion: '1.0.0',
        runConfigId: 'run-2',
        extractedAt: '2026-08-24T00:00:00Z',
        synthetic: true,
      },
      {
        paperId: 'paper-a',
        locator: 'fig:1',
        datasetId: 'ds-2',
        metricId: 'metric-a',
        datasetVersion: '1',
        methodVersion: '1.0.0',
        runConfigId: 'run-3',
        extractedAt: '2026-08-24T00:00:00Z',
        synthetic: false,
      },
      {
        paperId: 'paper-b',
        locator: 'table:S1',
        datasetId: 'ds-1',
        metricId: 'metric-a',
        datasetVersion: '1',
        methodVersion: '1.0.0',
        runConfigId: 'run-4',
        extractedAt: '2026-08-24T00:00:00Z',
        synthetic: true,
      },
    ]
    const grouped = groupEvidenceLinks(links)
    assert.equal(grouped.length, 3)
    assert.deepEqual(
      grouped.map((group) => ({ paperId: group.paperId, locator: group.locator, datasetId: group.datasetId })),
      [
        { paperId: 'paper-a', locator: 'fig:1', datasetId: 'ds-1' },
        { paperId: 'paper-a', locator: 'fig:1', datasetId: 'ds-2' },
        { paperId: 'paper-b', locator: 'table:S1', datasetId: 'ds-1' },
      ],
    )
    assert.equal(grouped[0]?.links.length, 2)
    assert.equal(grouped[0]?.synthetic, true)
    assert.equal(grouped[1]?.synthetic, false)
    assert.equal(grouped[2]?.synthetic, true)
  })

  it('download helper never reads window at module scope or sends content away', () => {
    const source = readSource('app/services/download.ts')
    assert.equal(source.includes('window'), false)
    assert.equal(source.includes('fetch('), false)
    assert.equal(source.includes('XMLHttpRequest'), false)
    assert.match(source, /finally/)
    assert.match(source, /revokeObjectURL/)
  })

  it('ConfigDownloads compiles only after OK when executable and keeps adapter defaults empty', () => {
    const source = readSource('app/components/autoselect/ConfigDownloads.vue')
    assert.match(source, /compileConfig/)
    assert.match(source, /canDownload/)
    assert.match(source, /compileIfDownloadable/)
    assert.match(source, /currentBoundProfile|submittedProfile/)
    assert.match(source, /DEFAULT_ADAPTERS/)
    assert.match(source, /declaredAdapters/)
    assert.match(source, /toISOString/)
    assert.match(source, /roles\[0\]/)
    assert.match(source, /profileFingerprint/)
    assert.match(source, /installCommand/)
    assert.match(source, /preprocessing/)
    assert.match(source, /outputKeys|outputs/)
    assert.match(source, /scFocus/)
    assert.match(source, /scRL/)
    assert.match(source, /downloadCompiled/)
    assert.equal((source.match(/<button/g) ?? []).length, 3)
    assert.equal(source.includes('fetch('), false)
    assert.equal(source.includes('window'), false)
  })

  it('EvidenceDrawer lists registry HTTPS links and groups observation locators', () => {
    const source = readSource('app/components/autoselect/EvidenceDrawer.vue')
    assert.match(source, /groupEvidenceLinks/)
    assert.match(source, /paperUrl/)
    assert.match(source, /docsUrl/)
    assert.match(source, /sourceUrl/)
    assert.match(source, /paperId/)
    assert.match(source, /locator/)
    assert.match(source, /datasetId/)
    assert.match(source, /synthetic/)
    assert.match(source, /https/)
  })

  it('RecommendationCard mounts the drawer and local downloads', () => {
    const card = readSource('app/components/autoselect/RecommendationCard.vue')
    assert.match(card, /EvidenceDrawer/)
    assert.match(card, /ConfigDownloads/)
  })
})
