#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public-graph.manifest.json'), 'utf8'))
const routeMap = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public-graph.routes.json'), 'utf8'))
const siteById = new Map(manifest.sites.map((site) => [site.id, site]))

const getSite = (id) => {
  const site = siteById.get(id)
  if (!site) {
    throw new Error(`Missing site ${id} in public-graph manifest.`)
  }
  return site
}

const checks = [
  {
    routeId: null,
    file: '.output/public/index.html',
    canonical: 'https://peterponyu.github.io/scportal/'
  },
  {
    routeId: 'datasets',
    file: '.output/public/datasets/index.html',
    canonical: 'https://peterponyu.github.io/scportal/datasets/'
  },
  {
    routeId: 'benchmarks',
    file: '.output/public/benchmarks/index.html',
    canonical: 'https://peterponyu.github.io/scportal/benchmarks/'
  },
  {
    routeId: 'models',
    file: '.output/public/models/index.html',
    canonical: 'https://peterponyu.github.io/scportal/models/'
  },
  {
    routeId: 'explorer',
    file: '.output/public/explorer/index.html',
    canonical: 'https://peterponyu.github.io/scportal/explorer/'
  }
]

let failed = false
const forbiddenUrls = manifest.sites
  .filter((site) => site.boundary !== 'public')
  .map((site) => site.canonical_url)

for (const check of checks) {
  const file = path.join(repoRoot, check.file)
  const html = fs.readFileSync(file, 'utf8')

  if (!html.includes(check.canonical)) {
    failed = true
    console.error(`FAIL ${check.file}: missing canonical ${check.canonical}`)
  }

  if (!html.includes(`content="${check.canonical}"`)) {
    failed = true
    console.error(`FAIL ${check.file}: missing og:url ${check.canonical}`)
  }

  if (check.routeId) {
    const routeConfig = routeMap[check.routeId]
    if (!routeConfig || !Array.isArray(routeConfig.related_site_ids)) {
      failed = true
      console.error(`FAIL ${check.file}: missing route map entry for ${check.routeId}`)
    } else {
      for (const siteId of routeConfig.related_site_ids) {
        const site = getSite(siteId)
        if (!html.includes(site.name)) {
          failed = true
          console.error(`FAIL ${check.file}: missing destination name ${site.name}`)
        }
        if (!html.includes(site.canonical_url)) {
          failed = true
          console.error(`FAIL ${check.file}: missing destination URL ${site.canonical_url}`)
        }
      }
    }
  }

  if (html.includes('/scportal/scportal/')) {
    failed = true
    console.error(`FAIL ${check.file}: found duplicated /scportal/scportal/ canonical pattern`)
  }

  for (const forbiddenUrl of forbiddenUrls) {
    if (html.includes(forbiddenUrl)) {
      failed = true
      console.error(`FAIL ${check.file}: leaked forbidden hidden/local URL ${forbiddenUrl}`)
    }
  }
}

if (failed) {
  process.exitCode = 1
} else {
  console.log('Rendered public graph checks passed.')
}
