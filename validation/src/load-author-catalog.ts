import { resolve } from 'node:path'
import { loadRouterCatalogFrom, type RouterCatalog } from './load-catalog.ts'

export async function loadAuthorCatalog(): Promise<RouterCatalog> {
  return loadRouterCatalogFrom(resolve(import.meta.dirname, '../../data/router/author'), 'observations.json')
}
