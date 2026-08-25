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
  if (typeof value !== 'string') return false
  const [dateText, timeText, ...extra] = value.split(/t|\s/i)
  if (extra.length || !dateText || !timeText) return false
  const date = /^(\d\d\d\d)-(\d\d)-(\d\d)$/.exec(dateText)
  const time = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i.exec(timeText)
  if (!date || !time) return false
  const year = +date[1]; const month = +date[2]; const day = +date[3]
  const days = [0, 31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month < 1 || month > 12 || day < 1 || day > days[month]) return false
  const hour = +time[1]; const minute = +time[2]; const second = +time[3]; const timezone = time[4]; const sign = time[5] === '-' ? -1 : 1; const offsetHour = +(time[6] || 0); const offsetMinute = +(time[7] || 0)
  if (!timezone || offsetHour > 23 || offsetMinute > 59) return false
  if (hour <= 23 && minute <= 59 && second < 60) return true
  const utcMinute = minute - offsetMinute * sign
  const utcHour = hour - offsetHour * sign - (utcMinute < 0 ? 1 : 0)
  return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61
}
