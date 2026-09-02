import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BASE_URL, PUBLIC_ROUTES, SITE_URL } from '../../config/site.ts'
import { getResourceLink, getRouteDestinations, normalizeCanonicalUrl, publicGraphResources } from '../../app/utils/publicGraph.ts'

describe('public route contract', () => {
  it('keeps the public portal routes including AutoSelect', () => {
    assert.deepEqual([...PUBLIC_ROUTES], ['/', '/datasets', '/explorer', '/benchmarks', '/models', '/about', '/autoselect'])
  })

  it('keeps the Pages base path and canonical origin', () => {
    assert.equal(BASE_URL, '/scportal/')
    assert.equal(SITE_URL, 'https://peterponyu.github.io/scportal/')
  })

  it('derives route destinations from route IDs and normalizes root URLs', () => {
    const destinations = getRouteDestinations('benchmarks')
    assert.ok(destinations.some((destination) => destination.id === 'scccvgben_atlas'))
    assert.ok(destinations.every((destination) => destination.href.endsWith('/')))
    assert.equal(normalizeCanonicalUrl('https://example.org/root'), 'https://example.org/root/')
    assert.equal(normalizeCanonicalUrl('https://example.org/root///'), 'https://example.org/root/')
  })

  it('exposes the local-only Model Router as a safe resource link', () => {
    const resource = getResourceLink('model_router')
    assert.equal(resource.href, 'https://github.com/PeterPonyu/model-router')
    assert.equal(resource.availability, 'local_only')
    assert.equal(resource.runtime_endpoint, null)
    assert.equal(publicGraphResources.length, 1)
  })
})
