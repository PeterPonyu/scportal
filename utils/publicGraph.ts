import manifest from '../public-graph.manifest.json'
import routeMap from '../public-graph.routes.json'

type VisibilityMode = 'featured' | 'listed' | 'hidden'

type PublicGraphSite = {
  id: string
  name: string
  canonical_url: string
  boundary: 'public' | 'local_first' | 'landing_only'
  visibility: {
    scportal: VisibilityMode
  }
}

type PublicGraphManifest = {
  sites: PublicGraphSite[]
}

type RouteMap = Record<string, { related_site_ids: string[] }>

type RouteDestinationConfig = {
  id: string
  summary: string
  ctaLabel: string
}

export type RouteDestination = RouteDestinationConfig & {
  name: string
  href: string
}

const graph = manifest as PublicGraphManifest
const scportalRouteMap = routeMap as RouteMap
const HOMEPAGE_ID = 'homepage'

const ensure: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const isScportalVisible = (site: PublicGraphSite) =>
  site.id !== 'scportal' &&
  site.id !== HOMEPAGE_ID &&
  site.boundary === 'public' &&
  site.visibility.scportal !== 'hidden'

for (const site of graph.sites) {
  ensure(typeof site.name === 'string' && site.name.length > 0, 'Each public graph site needs a name.')
  ensure(typeof site.canonical_url === 'string' && site.canonical_url.length > 0, `Site ${site.id} needs a canonical_url.`)
  ensure(
    site.visibility?.scportal === 'featured' ||
    site.visibility?.scportal === 'listed' ||
    site.visibility?.scportal === 'hidden',
    `Site ${site.id} must define visibility.scportal.`
  )
}

export const publicGraphSites = graph.sites
const siteById = new Map(publicGraphSites.map((site) => [site.id, site]))

export const featuredScportalSites = publicGraphSites.filter(
  (site) => isScportalVisible(site) && site.visibility.scportal === 'featured'
)

export const listedScportalSites = publicGraphSites.filter(
  (site) => isScportalVisible(site) && site.visibility.scportal === 'listed'
)

export const shellScportalSites = [...featuredScportalSites, ...listedScportalSites]

const resolveSite = (id: string): PublicGraphSite => {
  const site = siteById.get(id)
  ensure(site, `Public graph is missing site ${id}.`)
  return site
}

export const homepageLink = resolveSite(HOMEPAGE_ID)
export const scportalLink = resolveSite('scportal')

const resolvePublicDestinationSite = (id: string): PublicGraphSite => {
  const site = resolveSite(id)
  ensure(site.boundary === 'public', `Route destination ${id} must remain a public-boundary site.`)
  return site
}

export const lioraBenchmarkLink = resolvePublicDestinationSite('liora_benchmarks')
export const lioraBenchmarksLink = lioraBenchmarkLink
export const scccvgbenLink = resolvePublicDestinationSite('scccvgben')

const routeDestinationTemplates: Record<string, RouteDestinationConfig[]> = {
  datasets: [
    {
      id: 'iaode_pages',
      summary: 'Public iAODE destination for dataset browsing, explorer pages, and project overview context.',
      ctaLabel: 'Open iAODE Pages'
    },
    {
      id: 'liora_benchmarks',
      summary: 'Focused LAIOR destination for benchmark datasets and related evaluation context.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'scCCVGBen companion resource for the 200-dataset scRNA-seq/scATAC-seq benchmark cohort and per-dataset metadata context.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'GAHIB companion site for the graph-attention information-bottleneck framework, with method overview and supplementary figures tied to dataset context.',
      ctaLabel: 'Open GAHIB Companion Site'
    }
  ],
  benchmarks: [
    {
      id: 'liora_benchmarks',
      summary: 'Interactive benchmark destination with model metrics, ranking views, and LAIOR detail pages.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'Centroid-coupled VAE benchmark resource with 32 methods, 20 metrics, and publication-linked benchmark figures.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'GAHIB companion site for the graph-attention information-bottleneck framework, with paper-aligned method context for benchmark comparison.',
      ctaLabel: 'Open GAHIB Companion Site'
    },
    {
      id: 'iaode_pages',
      summary: 'Public iAODE destination for the complementary dataset and explorer surfaces behind these metrics.',
      ctaLabel: 'Open iAODE Pages'
    }
  ],
  models: [
    {
      id: 'liora_benchmarks',
      summary: 'Canonical benchmark microsite for model detail pages and evaluation context.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'Publication companion for scCCVGBen model comparisons, metric definitions, and supplementary online figures.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'GAHIB companion site for the graph-attention information-bottleneck framework, with method overview tied to model interpretation context.',
      ctaLabel: 'Open GAHIB Companion Site'
    },
    {
      id: 'iaode_pages',
      summary: 'Public iAODE destination for datasets and supporting project context tied to model evaluation.',
      ctaLabel: 'Open iAODE Pages'
    }
  ],
  explorer: [
    {
      id: 'iaode_pages',
      summary: 'Public iAODE destination for explorer context, datasets, and project-level entrypoints.',
      ctaLabel: 'Open iAODE Pages'
    },
    {
      id: 'liora_benchmarks',
      summary: 'Companion benchmark microsite for model and metric follow-up after continuity exploration.',
      ctaLabel: 'Open LAIOR Benchmarks'
    }
  ]
}

for (const [routeId, config] of Object.entries(scportalRouteMap)) {
  ensure(Array.isArray(config.related_site_ids), `Route ${routeId} must define related_site_ids.`)
}

export const getRouteDestinations = (routeId: keyof typeof routeDestinationTemplates): RouteDestination[] =>
  routeDestinationTemplates[routeId].map((item) => {
    const site = resolvePublicDestinationSite(item.id)
    return {
      ...item,
      name: site.name,
      href: site.canonical_url,
    }
  })
