import { bindRelease, buildRouterInput, loadRouterCatalog, type RouterCatalog } from './load-catalog.ts'

export { bindRelease, buildRouterInput, loadRouterCatalog }
export type { RouterCatalog }

export function scoringView(catalog: RouterCatalog): RouterCatalog {
  const copy = structuredClone(catalog)
  const methods = copy.methods.map((method) => ({ ...method, executable: true }))
  return {
    ...copy,
    methods,
    release: bindRelease(
      {
        datasets: copy.datasets,
        methods,
        metrics: copy.metrics,
        observations: copy.observations,
        templates: copy.templates,
      },
      {
        id: copy.release.id,
        synthetic: copy.release.synthetic,
        description: copy.release.description,
      },
    ),
  }
}
