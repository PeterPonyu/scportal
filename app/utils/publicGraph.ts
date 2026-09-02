import manifest from '../../public-graph.manifest.json' with { type: 'json' }
import routeMap from '../../public-graph.routes.json' with { type: 'json' }

export type VisibilityMode = 'featured' | 'listed' | 'hidden'
export type SiteAvailability = 'public' | 'landing_only' | 'local_only'

export type PublicGraphSite = {
  id: string
  name: string
  surface_kind: 'pages' | 'workspace'
  surface_group: string
  canonical_url: string | null
  role: string
  availability: SiteAvailability
  source_repo: string
  deploy_repo: string | null
  visibility: {
    homepage: 'primary' | 'secondary' | 'hidden'
    homepage_order: number | null
    scportal: VisibilityMode
    sitemap: boolean
  }
  related_sites: string[]
}

export type PublicGraphResource = {
  id: string
  name: string
  kind: string
  availability: 'local_only'
  public_url: string
  runtime_endpoint: null
  disclosure: string
  related_sites: string[]
}

export type PublicDestinationSite = PublicGraphSite & {
  availability: 'public'
  canonical_url: string
}

type PublicGraphManifest = {
  sites: PublicGraphSite[]
  resources: PublicGraphResource[]
}

type RouteDestinationConfig = {
  site_id: string
  summary: string
  cta_label: string
}

type RouteMapEntry = {
  destinations: RouteDestinationConfig[]
}

type RouteMap = Record<string, RouteMapEntry>

export type RouteDestination = {
  id: string
  name: string
  href: string
  summary: string
  ctaLabel: string
}

export type PublicResourceLink = PublicGraphResource & {
  href: string
}

const graph = manifest as PublicGraphManifest
const scportalRouteMap = routeMap as RouteMap
const HOMEPAGE_ID = 'homepage'

const ensure: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

export function normalizeCanonicalUrl(url: string): string {
  const parsed = new URL(url)
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/')
  if (!parsed.pathname.endsWith('/')) parsed.pathname += '/'
  return parsed.toString()
}

const isScportalVisible = (site: PublicGraphSite): site is PublicDestinationSite =>
  site.id !== 'scportal' &&
  site.id !== HOMEPAGE_ID &&
  site.availability === 'public' &&
  site.canonical_url !== null &&
  site.visibility.scportal !== 'hidden'

for (const site of graph.sites) {
  ensure(typeof site.id === 'string' && site.id.length > 0, 'Each public graph site needs an id.')
  ensure(typeof site.name === 'string' && site.name.length > 0, `Site ${site.id} needs a name.`)
  ensure(site.canonical_url === null || (typeof site.canonical_url === 'string' && site.canonical_url.length > 0), `Site ${site.id} needs a canonical_url or null.`)
  ensure(Array.isArray(site.related_sites), `Site ${site.id} needs related_sites.`)
  ensure(
    site.visibility?.scportal === 'featured' ||
    site.visibility?.scportal === 'listed' ||
    site.visibility?.scportal === 'hidden',
    `Site ${site.id} must define visibility.scportal.`
  )
}

for (const resource of graph.resources) {
  ensure(resource.availability === 'local_only', `Resource ${resource.id} must remain local_only.`)
  ensure(resource.runtime_endpoint === null, `Resource ${resource.id} cannot expose a runtime endpoint.`)
  ensure(typeof resource.public_url === 'string' && resource.public_url.startsWith('https://'), `Resource ${resource.id} needs a public https URL.`)
}

export const publicGraphSites = graph.sites
export const publicGraphResources = graph.resources
const siteById = new Map(publicGraphSites.map((site) => [site.id, site]))
const resourceById = new Map(publicGraphResources.map((resource) => [resource.id, resource]))

export const featuredScportalSites = publicGraphSites.filter(
  (site): site is PublicDestinationSite => isScportalVisible(site) && site.visibility.scportal === 'featured'
)

export const listedScportalSites = publicGraphSites.filter(
  (site): site is PublicDestinationSite => isScportalVisible(site) && site.visibility.scportal === 'listed'
)

export const shellScportalSites = [...featuredScportalSites, ...listedScportalSites]

const resolveSite = (id: string): PublicGraphSite => {
  const site = siteById.get(id)
  ensure(site, `Public graph is missing site ${id}.`)
  return site
}

const hasPublicCanonicalUrl = (site: PublicGraphSite): site is PublicDestinationSite =>
  site.availability === 'public' && site.canonical_url !== null

const resolvePublicDestinationSite = (id: string): PublicDestinationSite => {
  const site = resolveSite(id)
  ensure(hasPublicCanonicalUrl(site), `Route destination ${id} must remain a publicly available site with a canonical URL.`)
  return site
}

export const homepageLink = resolvePublicDestinationSite(HOMEPAGE_ID)
export const scportalLink = resolveSite('scportal')
export const lioraBenchmarkLink = resolvePublicDestinationSite('liora_benchmarks')
export const lioraBenchmarksLink = lioraBenchmarkLink
export const scccvgbenLink = resolvePublicDestinationSite('scccvgben')

export type RouteId = 'datasets' | 'benchmarks' | 'models' | 'explorer' | 'autoselect'

for (const [routeId, config] of Object.entries(scportalRouteMap)) {
  ensure(config && Array.isArray(config.destinations), `Route ${routeId} must define destinations.`)
  const destinationIds = config.destinations.map((destination) => destination.site_id)
  ensure(new Set(destinationIds).size === destinationIds.length, `Route ${routeId} contains duplicate destination IDs.`)
  for (const destination of config.destinations) {
    ensure(typeof destination.site_id === 'string' && destination.site_id.length > 0, `Route ${routeId} has an invalid site_id.`)
    ensure(typeof destination.summary === 'string' && destination.summary.length > 0, `Route ${routeId} destination ${destination.site_id} needs a summary.`)
    ensure(typeof destination.cta_label === 'string' && destination.cta_label.length > 0, `Route ${routeId} destination ${destination.site_id} needs a cta_label.`)
  }
}

export const getRouteDestinations = (routeId: RouteId): RouteDestination[] => {
  const config = scportalRouteMap[routeId]
  ensure(config, `Public graph route ${routeId} is missing.`)
  return config.destinations.map((item) => {
    const site = resolvePublicDestinationSite(item.site_id)
    return {
      id: site.id,
      name: site.name,
      href: normalizeCanonicalUrl(site.canonical_url),
      summary: item.summary,
      ctaLabel: item.cta_label,
    }
  })
}

export const getResourceLink = (resourceId: string): PublicResourceLink => {
  const resource = resourceById.get(resourceId)
  ensure(resource, `Public graph is missing resource ${resourceId}.`)
  ensure(resource.runtime_endpoint === null, `Resource ${resourceId} cannot expose a runtime endpoint.`)
  return { ...resource, href: resource.public_url }
}
