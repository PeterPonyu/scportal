import bridgeSnapshot from '../../data/thesis-bridge.json' with { type: 'json' }
import methodsSnapshot from '../../data/thesis-methods-public.json' with { type: 'json' }
import { publicGraphSites, type PublicGraphSite } from './publicGraph.ts'

export type ThesisMethodPublic = {
  namespace: 'thesis.method'
  id: string
  layer: string
  paper_url: string
  source_repo: string
  site_ids: string[]
  surface_status: 'public' | 'landing_only' | 'not_available'
  identity_status: 'resolved'
  evidence_status: string
  executable: false
  router_binding: null
}

export type ThesisMethodScope = {
  identityCount: number
  syntheticCandidateCount: number
  providerFamilyCount: number
}

const expectedMethodIds = [...(bridgeSnapshot as { methodIds: string[] }).methodIds]
const methods = methodsSnapshot as ThesisMethodPublic[]
const methodIds = methods.map((method) => method.id)

if (methods.length !== expectedMethodIds.length || methodIds.some((id, index) => id !== expectedMethodIds[index])) {
  throw new Error('Public thesis method registry must preserve the ordered 13-method bridge identity list.')
}

if (methods.some((method) => method.namespace !== 'thesis.method' || method.executable !== false || method.router_binding !== null)) {
  throw new Error('Public thesis method registry may only expose non-executable traceability records.')
}

const siteById = new Map(publicGraphSites.map((site) => [site.id, site]))

export const thesisMethods = methods

export const thesisMethodScope: ThesisMethodScope = {
  identityCount: thesisMethods.length,
  syntheticCandidateCount: 3,
  providerFamilyCount: 3,
}

export function resolveMethodSites(method: ThesisMethodPublic): PublicGraphSite[] {
  return method.site_ids.map((siteId) => {
    const site = siteById.get(siteId)
    if (!site) throw new Error(`Thesis method ${method.id} references missing site ${siteId}.`)
    return site
  })
}

export function methodSiteLabel(site: PublicGraphSite): string {
  if (site.availability === 'landing_only') return `${site.name} · landing-only`
  if (site.availability === 'local_only') return `${site.name} · local-only`
  return site.name
}
