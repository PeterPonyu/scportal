import { resolve } from 'node:path'
import { authorReleaseMeta } from '../ingestion/import-observations.ts'
import { bindRelease, loadRouterCatalogFrom, type RouterCatalog } from './load-catalog.ts'

export async function loadAuthorCatalog(): Promise<RouterCatalog> {
  const catalog = await loadRouterCatalogFrom(resolve(import.meta.dirname, '../../data/router/author'), 'observations.json')
  const meta = authorReleaseMeta(
    { id: catalog.release.id, synthetic: catalog.release.synthetic, description: catalog.release.description },
    catalog.observations,
  )
  if (meta.synthetic === catalog.release.synthetic) return catalog
  return {
    ...catalog,
    release: bindRelease({
      datasets: catalog.datasets,
      methods: catalog.methods,
      metrics: catalog.metrics,
      observations: catalog.observations,
      templates: catalog.templates,
    }, meta),
  }
}
