export const SAFE_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor'])

export function ownDataRecord(value: unknown, label: string, allowedDangerous: readonly string[] = []): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error(`${label} must be a plain own-data object`)
  const result = Object.create(null) as Record<string, unknown>
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || (dangerousKeys.has(key) && !allowedDangerous.includes(key))) throw new Error(`${label} contains unsafe or symbol fields`)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(`${label}.${key} must be an enumerable own data field`)
    result[key] = descriptor.value
  }
  return result
}

export function denseOwnDataArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) throw new Error(`${label} must be a dense own-data array`)
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) throw new Error(`${label} must be a dense own-data array`)
  }
  return value
}

export function safeToken(value: unknown): value is string { return typeof value === 'string' && SAFE_TOKEN.test(value) }
export function absoluteHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || [...value].some((character) => character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f)) return false
  try { const url = new URL(value); return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0 } catch { return false }
}

export function rfc3339DateTime(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, sign, offsetHourText, offsetMinuteText] = match
  const year = Number(yearText); const month = Number(monthText); const day = Number(dayText); const hour = Number(hourText); const minute = Number(minuteText); const second = Number(secondText)
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day < 1 || day > days) return false
  if (sign && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) return false
  return !Number.isNaN(Date.parse(value))
}
