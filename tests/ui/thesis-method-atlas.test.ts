import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { describe, it } from 'node:test'
import { resolve } from 'node:path'

import { thesisMethodScope, thesisMethods, resolveMethodSites } from '../../app/utils/thesisMethods.ts'

const expectedIds = [
  'iVAE', 'CCVGAE', 'LiVAE', 'GAHIB', 'MCCVAE', 'GNODEVAE', 'CODE',
  'iAODE', 'LAIOR', 'scRL', 'scFocus', 'CLOP-DiT', 'scCCVGBen'
]

describe('public thesis method atlas', () => {
  it('preserves the ordered thirteen-method thesis bridge identity list', () => {
    assert.deepEqual(thesisMethods.map((method) => method.id), expectedIds)
    assert.equal(thesisMethodScope.identityCount, 13)
    assert.equal(thesisMethodScope.syntheticCandidateCount, 3)
    assert.equal(thesisMethodScope.providerFamilyCount, 3)
    assert.ok(thesisMethods.every((method) => method.executable === false && method.router_binding === null))
  })

  it('resolves only declared public or landing-only site surfaces', () => {
    const gahib = thesisMethods.find((method) => method.id === 'GAHIB')
    const mccvae = thesisMethods.find((method) => method.id === 'MCCVAE')
    assert.equal(resolveMethodSites(gahib)[0].id, 'gahib_site')
    assert.equal(resolveMethodSites(mccvae)[0].availability, 'landing_only')
    assert.deepEqual(resolveMethodSites(thesisMethods.find((method) => method.id === 'iVAE')), [])
  })

  it('keeps atlas and scope disclosure in the AutoSelect source', async () => {
    const page = await readFile(resolve(import.meta.dirname, '../../app/pages/autoselect/index.vue'), 'utf8')
    const panel = await readFile(resolve(import.meta.dirname, '../../app/components/autoselect/ThesisIntegrationPanel.vue'), 'utf8')
    assert.match(page, /ThesisMethodAtlas/)
    assert.match(panel, /Model Router/)
    assert.match(panel, /13/)
    assert.match(panel, /synthetic/i)
  })
})
