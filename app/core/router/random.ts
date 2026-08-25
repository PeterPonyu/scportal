const UINT32_MAX = 0xffffffff
const UINT32_RANGE = 0x1_0000_0000

export function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function sortCodeUnits(values: readonly string[]): string[] {
  return [...values].sort(compareCodeUnits)
}

function requireUint32(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new Error('seed must be an unsigned 32-bit integer')
  }
}

export function createRng(seed: number): () => number {
  requireUint32(seed)
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE
  }
}
