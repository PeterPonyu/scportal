import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { BASE_URL, PUBLIC_ROUTES, SITE_URL } from '../../config/site.ts'

describe('public route contract', () => {
  it('keeps the public portal routes including AutoSelect', () => {
    assert.deepEqual([...PUBLIC_ROUTES], ['/', '/datasets', '/explorer', '/benchmarks', '/models', '/about', '/autoselect'])
  })

  it('keeps the Pages base path and canonical origin', () => {
    assert.equal(BASE_URL, '/scportal/')
    assert.equal(SITE_URL, 'https://peterponyu.github.io/scportal/')
  })
})
