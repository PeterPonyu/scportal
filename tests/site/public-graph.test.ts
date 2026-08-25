import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { scportalLink } from '../../app/utils/publicGraph.ts'

const manifest = JSON.parse(readFileSync(new URL('../../public-graph.manifest.json', import.meta.url), 'utf8'))

describe('canonical public graph', () => {
  it('has exactly one scportal discovery hub', () => {
    const hubs = manifest.sites.filter((site) => site.id === 'scportal')
    assert.equal(hubs.length, 1)
    assert.equal(hubs[0].canonical_url, 'https://peterponyu.github.io/scportal/')
    assert.equal(hubs[0].source_repo, 'PeterPonyu/scportal')
    assert.equal(hubs[0].deploy_repo, 'PeterPonyu/scportal')
  })

  it('keeps local-only sites off the public web', () => {
    const localOnly = manifest.sites.filter((site) => site.availability === 'local_only')
    assert.ok(localOnly.length >= 1)
    for (const site of localOnly) {
      assert.equal(site.canonical_url, null)
      assert.equal(site.id, 'iaode_workspace')
    }
  })

  it('keeps scCCVGBen source and deploy repos split', () => {
    const site = manifest.sites.find((entry) => entry.id === 'scccvgben')
    assert.equal(site.source_repo, 'PeterPonyu/scCCVGBen')
    assert.equal(site.deploy_repo, 'PeterPonyu/scccvgben-next')
  })
})

describe('moved publicGraph helper', () => {
  it('still resolves the SCPortal hub', () => {
    assert.equal(scportalLink.id, 'scportal')
    assert.equal(scportalLink.canonical_url, 'https://peterponyu.github.io/scportal/')
  })
})
