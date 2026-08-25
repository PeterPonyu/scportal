export const ROUTER_VERSION = 'router-core-v1'
export const ROUTER_DATA_BASE = '/scportal/router-data'

export async function loadRouterCatalog(base = ROUTER_DATA_BASE) {
  const response = await fetch(`${base}/catalog.json`)
  if (!response.ok) throw new Error(`router catalog HTTP ${response.status}`)
  return response.json()
}

export async function loadObservationGroups(groups: string[], base = ROUTER_DATA_BASE) {
  const unique = [...new Set(groups)]
  const allowed = ['latent_geometry', 'continuity', 'trajectory', 'stability', 'biology', 'resources']
  if (unique.some((group) => !allowed.includes(group))) throw new Error('unknown observation group')
  const chunks = await Promise.all(unique.map(async (group) => {
    const response = await fetch(`${base}/observations-${group}.json`)
    if (!response.ok) throw new Error(`observations ${group} HTTP ${response.status}`)
    return response.json()
  }))
  return chunks.flat()
}

export async function loadRouterRelease(base = ROUTER_DATA_BASE) {
  const response = await fetch(`${base}/release.json`)
  if (!response.ok) throw new Error(`router release HTTP ${response.status}`)
  const release = await response.json()
  return {
    id: release.id,
    synthetic: release.synthetic,
    description: release.description,
    configDigest: release.configDigest,
    evidenceDigest: release.evidenceDigest,
  }
}
