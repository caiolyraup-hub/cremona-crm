import type { Json } from '@/types/database'

const BRAZIL_COUNTRY_CODE = '55'
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 50
const MAX_CUSTOM_FIELDS_BYTES = 4096

export type NormalizedPhone = {
  phone: string | null
  digits: string | null
  whatsappAddress: string | null
  error?: string
}

export function normalizeOptionalString(value: unknown, maxLength = 500): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

export function normalizeEmail(value: unknown): { email: string | null; error?: string } {
  const email = normalizeOptionalString(value, 254)?.toLowerCase() ?? null
  if (!email) return { email: null }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { email: null, error: 'E-mail invalido.' }
  }
  return { email }
}

export function normalizeBrazilianPhone(value: unknown, required = false): NormalizedPhone {
  const raw = normalizeOptionalString(value, 40)
  if (!raw) {
    return required
      ? { phone: null, digits: null, whatsappAddress: null, error: 'Telefone obrigatorio.' }
      : { phone: null, digits: null, whatsappAddress: null }
  }

  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  if (!/^\d{10,11}$/.test(digits)) {
    return { phone: null, digits: null, whatsappAddress: null, error: 'Telefone invalido.' }
  }

  const ddd = Number(digits.slice(0, 2))
  if (!Number.isInteger(ddd) || ddd < 11 || ddd > 99) {
    return { phone: null, digits: null, whatsappAddress: null, error: 'DDD invalido.' }
  }

  const national = `${BRAZIL_COUNTRY_CODE}${digits}`
  return {
    phone: `+${national}`,
    digits: national,
    whatsappAddress: `whatsapp:+${national}`,
  }
}

export function buildContactPhoneCandidates(phone: string | null | undefined): string[] {
  const raw = phone?.trim() ?? ''
  const digits = raw.replace(/\D/g, '')
  const withoutCountry =
    digits.startsWith(BRAZIL_COUNTRY_CODE) && (digits.length === 12 || digits.length === 13)
      ? digits.slice(2)
      : digits

  return Array.from(
    new Set([
      raw,
      digits,
      withoutCountry,
      digits ? `+${digits}` : '',
      withoutCountry ? `+${BRAZIL_COUNTRY_CODE}${withoutCountry}` : '',
    ].filter(Boolean))
  )
}

export function normalizeTags(value: unknown, extra: string[] = []): { tags: string[]; error?: string } {
  const raw = Array.isArray(value) ? value : []
  const tags = [...extra, ...raw]
    .map((tag) => normalizeOptionalString(tag, MAX_TAG_LENGTH))
    .filter((tag): tag is string => Boolean(tag))

  const unique = Array.from(new Set(tags))
  if (unique.length > MAX_TAGS) {
    return { tags: unique.slice(0, MAX_TAGS), error: `No maximo ${MAX_TAGS} tags sao permitidas.` }
  }

  return { tags: unique }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function normalizeCustomFields(value: unknown): { customFields: Record<string, Json>; error?: string } {
  if (value === undefined || value === null) return { customFields: {} }
  if (!isPlainObject(value)) return { customFields: {}, error: 'custom_fields deve ser um objeto.' }

  const serialized = JSON.stringify(value)
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CUSTOM_FIELDS_BYTES) {
    return { customFields: {}, error: 'custom_fields excede o tamanho maximo permitido.' }
  }

  const clean: Record<string, Json> = {}
  for (const [key, entry] of Object.entries(value)) {
    const cleanKey = normalizeOptionalString(key, 80)
    if (!cleanKey) continue
    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean' ||
      Array.isArray(entry) ||
      isPlainObject(entry)
    ) {
      clean[cleanKey] = entry as Json
    }
  }

  return { customFields: clean }
}

export function mergeTags(current: string[] | null | undefined, next: string[]): string[] {
  return Array.from(new Set([...(current ?? []), ...next])).slice(0, MAX_TAGS)
}

export function mergeCustomFields(
  current: Json | null | undefined,
  next: Record<string, Json>
): Record<string, Json> {
  const currentObject =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, Json>)
      : {}

  return {
    ...currentObject,
    ...Object.fromEntries(
      Object.entries(next).filter(([, value]) => value !== undefined)
    ),
  }
}
