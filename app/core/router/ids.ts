export type EntityKind = 'dataset' | 'method' | 'metric'

export function canonicalizeId(
  kind: EntityKind,
  value: string,
  aliases: ReadonlyMap<string, string>,
): string {
  const normalized = value.trim().toLowerCase()
  const canonical = aliases.get(`${kind}:${normalized}`)
  if (!canonical) throw new Error(`unknown ${kind} id or alias: ${value}`)
  return canonical
}
