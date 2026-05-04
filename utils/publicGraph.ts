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
      summary: 'Browse iAODE datasets, explorer pages, and project details.',
      ctaLabel: 'Open iAODE Pages'
    },
    {
      id: 'liora_benchmarks',
      summary: 'Browse LAIOR benchmark datasets and evaluation results.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'See the scCCVGBen benchmark set, dataset coverage, and metadata.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'Read the GAHIB method overview and see supporting figures.',
      ctaLabel: 'Open GAHIB Companion Site'
    }
  ],
  benchmarks: [
    {
      id: 'liora_benchmarks',
      summary: 'Compare models, rankings, and benchmark results in LAIOR.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'Review scCCVGBen model comparisons, metric coverage, and benchmark figures.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'Read how GAHIB works and compare it with other benchmark methods.',
      ctaLabel: 'Open GAHIB Companion Site'
    },
    {
      id: 'iaode_pages',
      summary: 'Open the matching iAODE dataset and explorer pages for these metrics.',
      ctaLabel: 'Open iAODE Pages'
    }
  ],
  models: [
    {
      id: 'liora_benchmarks',
      summary: 'View model pages, benchmark results, and evaluation details.',
      ctaLabel: 'Open LAIOR Benchmarks'
    },
    {
      id: 'scccvgben',
      summary: 'Compare scCCVGBen models, metric definitions, and online figures.',
      ctaLabel: 'Open scCCVGBen'
    },
    {
      id: 'gahib_site',
      summary: 'Read the GAHIB method overview for model interpretation.',
      ctaLabel: 'Open GAHIB Companion Site'
    },
    {
      id: 'iaode_pages',
      summary: 'Open iAODE datasets and project details related to this evaluation.',
      ctaLabel: 'Open iAODE Pages'
    }
  ],
  explorer: [
    {
      id: 'iaode_pages',
      summary: 'Open iAODE explorer pages, datasets, and overview content.',
      ctaLabel: 'Open iAODE Pages'
    },
    {
      id: 'liora_benchmarks',
      summary: 'Check model and metric results after exploring continuity patterns.',
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
