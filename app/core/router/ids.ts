export type EntityKind = 'dataset' | 'method' | 'metric'

const unsafeIdentities = new Set(['__proto__', 'prototype', 'constructor'])

export function isSafeCanonicalId(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 && !unsafeIdentities.has(normalized)
}

export function canonicalizeId(
  kind: EntityKind,
  value: string,
  aliases: ReadonlyMap<string, string>,
): string {
  const normalized = value.trim().toLowerCase()
  if (!normalized) throw new Error(`unknown ${kind} id or alias: ${value}`)
  if (!isSafeCanonicalId(value)) throw new Error(`unsafe ${kind} identity: ${value}`)
  const canonical = aliases.get(`${kind}:${normalized}`)
  if (!canonical) throw new Error(`unknown ${kind} id or alias: ${value}`)
  return canonical
}
