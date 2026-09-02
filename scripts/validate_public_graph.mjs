import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

const indexingModes = new Set(['index_follow', 'noindex_follow', 'noindex_nofollow'])
const visibilityModes = new Set(['featured', 'listed', 'hidden', 'primary', 'secondary'])
const siteSurfaceKinds = new Set(['pages', 'workspace'])

const fail = (condition, message) => {
  if (!condition) throw new Error(message)
}

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const assertHttpsUrl = (value, label) => {
  fail(typeof value === 'string' && value.length > 0, `${label} must be a non-empty URL`)
  const parsed = new URL(value)
  fail(parsed.protocol === 'https:', `${label} must use https`)
}

const assertVisibility = (site) => {
  fail(isRecord(site.visibility), `${site.id}: visibility is required`)
  for (const scope of ['homepage', 'scportal']) {
    fail(visibilityModes.has(site.visibility[scope]), `${site.id}: visibility.${scope} is invalid`)
  }
  fail(typeof site.visibility.sitemap === 'boolean', `${site.id}: visibility.sitemap must be boolean`)
  if (site.visibility.homepage !== 'hidden') {
    fail(Number.isInteger(site.visibility.homepage_order), `${site.id}: visible homepage site needs homepage_order`)
  }
}

export function validateManifest(manifest) {
  fail(isRecord(manifest), 'public graph manifest must be an object')
  fail(manifest.version === '2.0', 'public graph version must be 2.0')
  fail(isRecord(manifest.graph), 'graph metadata is required')
  fail(manifest.graph.identity_root === 'homepage', 'graph identity_root must be homepage')
  fail(manifest.graph.discovery_hub === 'scportal', 'graph discovery_hub must be scportal')
  fail(Array.isArray(manifest.sites), 'sites must be an array')
  fail(Array.isArray(manifest.resources), 'resources must be an array')

  const ids = new Set()
  for (const site of manifest.sites) {
    fail(isRecord(site), 'each public graph site must be an object')
    fail(typeof site.id === 'string' && site.id.length > 0, 'each public graph site needs an id')
    fail(!ids.has(site.id), `duplicate site id: ${site.id}`)
    ids.add(site.id)
    fail(typeof site.name === 'string' && site.name.length > 0, `${site.id}: name is required`)
    fail(siteSurfaceKinds.has(site.surface_kind), `${site.id}: invalid surface_kind`)
    fail(typeof site.surface_group === 'string' && site.surface_group.length > 0, `${site.id}: surface_group is required`)
    fail(typeof site.source_repo === 'string' && site.source_repo.includes('/'), `${site.id}: source_repo is required`)
    fail(['public', 'landing_only', 'local_only'].includes(site.availability), `${site.id}: invalid availability`)
    fail(typeof site.role === 'string' && site.role.length > 0, `${site.id}: role is required`)
    fail(isRecord(site.indexing), `${site.id}: indexing is required`)
    fail(indexingModes.has(site.indexing.mode), `${site.id}: invalid indexing mode`)
    assertVisibility(site)
    fail(Array.isArray(site.related_sites), `${site.id}: related_sites must be an array`)
    fail(new Set(site.related_sites).size === site.related_sites.length, `${site.id}: related_sites contains duplicates`)

    if (site.availability === 'local_only') {
      fail(site.canonical_url === null, `${site.id}: local_only canonical_url must be null`)
      fail(site.deploy_repo === null, `${site.id}: local_only deploy_repo must be null`)
      fail(site.visibility.sitemap === false, `${site.id}: local_only site cannot enter sitemap`)
      fail(site.visibility.homepage === 'hidden' && site.visibility.scportal === 'hidden', `${site.id}: local_only site must be hidden`)
      fail(site.indexing.mode === 'noindex_nofollow', `${site.id}: local_only site must be noindex_nofollow`)
    } else {
      assertHttpsUrl(site.canonical_url, `${site.id}: canonical_url`)
      fail(site.canonical_url.endsWith('/'), `${site.id}: canonical_url must end with /`)
      fail(typeof site.deploy_repo === 'string' && site.deploy_repo.includes('/'), `${site.id}: hosted site needs deploy_repo`)
    }

    if (site.availability === 'landing_only') {
      fail(site.indexing.mode === 'noindex_follow', `${site.id}: landing_only site must be noindex_follow`)
      fail(site.visibility.homepage === 'hidden' && site.visibility.scportal === 'hidden', `${site.id}: landing_only site must be hidden`)
      fail(site.visibility.sitemap === false, `${site.id}: landing_only site cannot enter sitemap`)
    }

    if (site.availability === 'public' && site.surface_kind === 'pages') {
      fail(site.canonical_url !== null, `${site.id}: public Pages site needs canonical_url`)
    }
  }

  const resourceIds = new Set()
  for (const resource of manifest.resources) {
    fail(isRecord(resource), 'each public graph resource must be an object')
    fail(typeof resource.id === 'string' && resource.id.length > 0, 'each resource needs an id')
    fail(!resourceIds.has(resource.id), `duplicate resource id: ${resource.id}`)
    resourceIds.add(resource.id)
    fail(typeof resource.name === 'string' && resource.name.length > 0, `${resource.id}: name is required`)
    fail(typeof resource.kind === 'string' && resource.kind.length > 0, `${resource.id}: kind is required`)
    fail(resource.availability === 'local_only', `${resource.id}: public resources must be local_only`)
    assertHttpsUrl(resource.public_url, `${resource.id}: public_url`)
    fail(resource.runtime_endpoint === null, `${resource.id}: runtime_endpoint must be null`)
    fail(typeof resource.disclosure === 'string' && resource.disclosure.length > 0, `${resource.id}: disclosure is required`)
    fail(Array.isArray(resource.related_sites), `${resource.id}: related_sites must be an array`)
  }

  return { siteIds: ids, resourceIds }
}

export function validateGraphEdges(manifest) {
  const { siteIds } = validateManifest(manifest)
  const sites = new Map(manifest.sites.map((site) => [site.id, site]))

  for (const site of manifest.sites) {
    for (const relatedId of site.related_sites) {
      fail(siteIds.has(relatedId), `${site.id}: related site ${relatedId} is missing from manifest`)
      fail(relatedId !== site.id, `${site.id}: a site cannot relate to itself`)

      const related = sites.get(relatedId)
      const bothHostedPublic = site.availability === 'public' && related.availability === 'public'
      if (bothHostedPublic) {
        fail(
          related.related_sites.includes(site.id),
          `asymmetric public edge: ${site.id} -> ${related.id}; reciprocal relation is required`
        )
      }
    }
  }

  for (const resource of manifest.resources) {
    for (const relatedId of resource.related_sites) {
      fail(siteIds.has(relatedId), `${resource.id}: related site ${relatedId} is missing from manifest`)
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? 'public-graph.manifest.json'
  const manifest = JSON.parse(fs.readFileSync(path, 'utf8'))
  const { siteIds, resourceIds } = validateManifest(manifest)
  validateGraphEdges(manifest)
  console.log(`Validated ${siteIds.size} public-graph sites and ${resourceIds.size} resources.`)
}
