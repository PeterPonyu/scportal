#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public-graph.manifest.json'), 'utf8'))
const routeMap = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public-graph.routes.json'), 'utf8'))
const siteById = new Map(manifest.sites.map((site) => [site.id, site]))
const expectedRelease = process.env.EXPECTED_RELEASE ?? null

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
  },
  {
    routeId: 'autoselect',
    file: '.output/public/autoselect/index.html',
    canonical: 'https://peterponyu.github.io/scportal/autoselect/'
  }
]

let failed = false
const forbiddenUrls = manifest.sites
  // Landing-only pages may be linked from an evidence/traceability card, but
  // local-only surfaces must never leak into generated public HTML.
  .filter((site) => site.availability === 'local_only' && site.canonical_url !== null)
  .map((site) => site.canonical_url)
const localWorkspacePaths = manifest.sites
  .filter((site) => site.availability === 'local_only' && typeof site.workspace_path === 'string')
  .map((site) => site.workspace_path)
const forbiddenPatterns = ['http://localhost', 'https://localhost', 'http://127.0.0.1', 'https://127.0.0.1', 'file://', '/home/']

const rootDocuments = [
  {
    file: '.output/public/robots.txt',
    required: ['User-agent: *', 'Allow: /scportal/', 'Sitemap: https://peterponyu.github.io/scportal/sitemap.xml']
  },
  {
    file: '.output/public/sitemap.xml',
    required: ['<?xml', '<urlset', 'https://peterponyu.github.io/scportal/']
  }
]

for (const document of rootDocuments) {
  const file = path.join(repoRoot, document.file)
  if (!fs.existsSync(file)) {
    failed = true
    console.error(`FAIL ${document.file}: missing required deployment-root document`)
    continue
  }

  const contents = fs.readFileSync(file, 'utf8')
  for (const required of document.required) {
    if (!contents.includes(required)) {
      failed = true
      console.error(`FAIL ${document.file}: missing required content ${required}`)
    }
  }
}

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

  if (expectedRelease && !html.includes(`name="scportal-release" content="${expectedRelease}"`)) {
    failed = true
    console.error(`FAIL ${check.file}: release marker does not match ${expectedRelease}`)
  }

  if (check.routeId) {
    const routeConfig = routeMap[check.routeId]
    if (!routeConfig || !Array.isArray(routeConfig.destinations)) {
      failed = true
      console.error(`FAIL ${check.file}: missing route map entry for ${check.routeId}`)
    } else {
      for (const destination of routeConfig.destinations) {
        const siteId = destination.site_id
        const site = getSite(siteId)
        if (site.availability !== 'public') {
          failed = true
          console.error(`FAIL ${check.file}: route destination ${siteId} is not public (${site.availability})`)
        }
        if (!html.includes(site.name)) {
          failed = true
          console.error(`FAIL ${check.file}: missing destination name ${site.name}`)
        }
        if (site.canonical_url === null || !html.includes(site.canonical_url)) {
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

  for (const workspacePath of localWorkspacePaths) {
    if (html.includes(workspacePath)) {
      failed = true
      console.error(`FAIL ${check.file}: leaked local-only workspace path ${workspacePath}`)
    }
  }

  for (const pattern of forbiddenPatterns) {
    if (html.includes(pattern)) {
      failed = true
      console.error(`FAIL ${check.file}: found forbidden boundary pattern ${pattern}`)
    }
  }

  if (check.routeId === 'autoselect') {
    for (const required of ['Thirteen publications', 'synthetic', 'Model Router', 'Local infrastructure']) {
      if (!html.toLowerCase().includes(required.toLowerCase())) {
        failed = true
        console.error(`FAIL ${check.file}: missing AutoSelect scope/resource marker ${required}`)
      }
    }
  }
}

if (failed) {
  process.exitCode = 1
} else {
  console.log('Rendered public graph checks passed.')
}
