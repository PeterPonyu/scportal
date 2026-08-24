import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const fail = (condition, message) => {
  if (!condition) throw new Error(message)
}

const indexingModes = new Set(['index_follow', 'noindex_follow', 'noindex_nofollow'])

export function validateManifest(manifest) {
  fail(manifest.version === '2.0', 'public graph version must be 2.0')
  fail(Array.isArray(manifest.sites), 'sites must be an array')
  const ids = new Set()
  for (const site of manifest.sites) {
    fail(!ids.has(site.id), `duplicate site id: ${site.id}`)
    ids.add(site.id)
    fail(typeof site.source_repo === 'string' && site.source_repo.includes('/'), `${site.id}: source_repo is required`)
    fail(['public', 'landing_only', 'local_only'].includes(site.availability), `${site.id}: invalid availability`)
    fail(site.indexing !== null && typeof site.indexing === 'object' && !Array.isArray(site.indexing), `${site.id}: indexing is required`)
    fail(indexingModes.has(site.indexing.mode), `${site.id}: invalid indexing mode`)
    if (site.availability === 'local_only') {
      fail(site.canonical_url === null, `${site.id}: local_only canonical_url must be null`)
      fail(site.deploy_repo === null, `${site.id}: local_only deploy_repo must be null`)
      fail(site.visibility.sitemap === false, `${site.id}: local_only site cannot enter sitemap`)
    } else {
      fail(typeof site.canonical_url === 'string', `${site.id}: hosted site needs canonical_url`)
      new URL(site.canonical_url)
      fail(typeof site.deploy_repo === 'string' && site.deploy_repo.includes('/'), `${site.id}: hosted site needs deploy_repo`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? 'public-graph.manifest.json'
  const manifest = JSON.parse(fs.readFileSync(path, 'utf8'))
  validateManifest(manifest)
  console.log(`Validated ${manifest.sites.length} public-graph entries.`)
}
