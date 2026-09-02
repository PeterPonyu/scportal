import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { validateGraphEdges, validateManifest } from '../../scripts/validate_public_graph.mjs'

const manifest = JSON.parse(readFileSync(new URL('../../public-graph.manifest.json', import.meta.url), 'utf8'))

describe('public graph contract extension', () => {
  it('exposes the atlas site and local-only Model Router resource', () => {
    validateManifest(manifest)
    validateGraphEdges(manifest)

    const atlas = manifest.sites.find((site) => site.id === 'scccvgben_atlas')
    assert.equal(atlas?.surface_kind, 'pages')
    assert.equal(atlas?.surface_group, 'scccvgben')
    assert.equal(atlas?.canonical_url, 'https://peterponyu.github.io/scCCVGBen/')

    const router = manifest.resources.find((resource) => resource.id === 'model_router')
    assert.equal(router?.availability, 'local_only')
    assert.equal(router?.public_url, 'https://github.com/PeterPonyu/model-router')
    assert.equal(router?.runtime_endpoint, null)
  })

  it('fails closed when a local-only site advertises a canonical URL', () => {
    const invalid = structuredClone(manifest)
    const workspace = invalid.sites.find((site) => site.id === 'iaode_workspace')
    workspace.canonical_url = 'https://example.invalid/workspace/'
    assert.throws(() => validateManifest(invalid), /local_only.*canonical_url/i)
  })

  it('fails closed when a default related-site edge is asymmetric', () => {
    const invalid = structuredClone(manifest)
    invalid.sites.find((site) => site.id === 'scccvgben_atlas').related_sites = ['scportal']
    assert.throws(() => validateGraphEdges(invalid), /asymmetric.*scccvgben_atlas|reciprocal/i)
  })

  it('fails closed when a resource exposes a runtime endpoint', () => {
    const invalid = structuredClone(manifest)
    invalid.resources.find((resource) => resource.id === 'model_router').runtime_endpoint = 'http://localhost:18787/'
    assert.throws(() => validateManifest(invalid), /runtime_endpoint/i)
  })
})
