#!/usr/bin/env node

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

import { validateGraphEdges } from './validate_public_graph.mjs'

export function checkPublicGraphEdges(manifest) {
  validateGraphEdges(manifest)
  return {
    siteCount: manifest.sites.length,
    resourceCount: manifest.resources.length,
    publicSiteCount: manifest.sites.filter((site) => site.availability === 'public').length,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? 'public-graph.manifest.json'
  const manifest = JSON.parse(fs.readFileSync(path, 'utf8'))
  const summary = checkPublicGraphEdges(manifest)
  console.log(`Public graph edges passed: ${summary.publicSiteCount} public sites, ${summary.siteCount} total sites, ${summary.resourceCount} resources.`)
}
