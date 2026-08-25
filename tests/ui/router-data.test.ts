import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'

import { buildRouterAssets } from '../../scripts/build_router_assets.mjs'
import { ROUTER_VERSION } from '../../app/services/routerData.ts'
import { releaseEvidenceDigest, sha256Hex, canonicalJson } from '../../app/core/router/release-digest.ts'

describe('router browser assets', () => {
  it('writes partitioned files and a digest-bound synthetic release', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'scportal-router-assets-'))
    try {
      const written = await buildRouterAssets(directory)
      assert.ok(written.includes('catalog.json'))
      assert.ok(written.includes('profiles.json'))
      assert.ok(written.includes('release.json'))
      assert.ok(written.includes('observations-trajectory.json'))
      const catalog = JSON.parse(await readFile(resolve(directory, 'catalog.json'), 'utf8'))
      assert.equal(Object.hasOwn(catalog, 'observations'), false)
      const release = JSON.parse(await readFile(resolve(directory, 'release.json'), 'utf8'))
      assert.equal(release.synthetic, true)
      assert.equal(release.id, 'router-evidence-synthetic-v1')
      assert.match(release.configDigest, /^[a-f0-9]{64}$/)
      assert.match(release.evidenceDigest, /^[a-f0-9]{64}$/)
      assert.equal(release.routerVersion, ROUTER_VERSION)
      const second = await buildRouterAssets(directory)
      assert.deepEqual(second, written)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('binds evidenceDigest to the exact releaseEvidenceDigest helper', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'scportal-router-assets-'))
    try {
      await buildRouterAssets(directory)
      const catalog = JSON.parse(await readFile(resolve(directory, 'catalog.json'), 'utf8'))
      const groups = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']
      const observations = (
        await Promise.all(groups.map(async (group) => JSON.parse(await readFile(resolve(directory, `observations-${group}.json`), 'utf8'))))
      ).flat()
      const release = JSON.parse(await readFile(resolve(directory, 'release.json'), 'utf8'))
      const expected = releaseEvidenceDigest(
        { datasets: catalog.datasets, methods: catalog.methods, metrics: catalog.metrics, observations },
        { id: release.id, synthetic: release.synthetic, description: release.description },
        release.configDigest,
      )
      assert.equal(release.evidenceDigest, expected)
      assert.notEqual(sha256Hex(canonicalJson({ tamper: true })), release.evidenceDigest)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
