import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { BASE_URL, PUBLIC_ROUTES, SITE_URL } from '../../config/site.ts'

const config = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')

describe('head and prerender contract', () => {
  it('keeps the Pages base path and site URL in nuxt.config.ts', () => {
    assert.match(config, /baseURL:\s*'\/scportal\/'/)
    assert.match(config, /siteUrl:\s*'https:\/\/peterponyu\.github\.io\/scportal\/'/)
    assert.equal(BASE_URL, '/scportal/')
    assert.equal(SITE_URL, 'https://peterponyu.github.io/scportal/')
  })

  it('drives prerender from the shared PUBLIC_ROUTES constant without a hardcoded autoselect route', () => {
    assert.match(config, /from '\.\/config\/site(?:\.ts)?'/)
    assert.deepEqual([...PUBLIC_ROUTES], ['/', '/datasets', '/explorer', '/benchmarks', '/models', '/about', '/autoselect'])
    assert.match(config, /routes:\s*\[\s*\.\.\.PUBLIC_ROUTES\s*\]/)
    assert.equal(/['"]\/autoselect['"]/.test(config), false)
  })
})
