import crypto from 'crypto'

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

export function generateLeadSourceKey(): string {
  return `cremona_ls_${crypto.randomBytes(32).toString('base64url')}`
}

export function hashLeadSourceKey(key: string): string {
  return sha256Hex(key.trim())
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`

  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
    .join(',')}}`
}

export function buildPayloadHash(value: unknown): string {
  return sha256Hex(stableStringify(value))
}

export function extractLeadSourceKey(headers: Headers): string | null {
  const authorization = headers.get('authorization')?.trim() ?? ''
  if (authorization.toLowerCase().startsWith('bearer ')) {
    const key = authorization.slice('bearer '.length).trim()
    return key || null
  }

  const fallback = headers.get('x-cremona-lead-key')?.trim()
  return fallback || null
}

export function maskPhone(value: string | null | undefined): string {
  const raw = value?.trim() ?? ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 4) return raw ? '****' : ''
  return `+${digits.slice(0, 4)}******${digits.slice(-4)}`
}

export function maskEmail(value: string | null | undefined): string {
  const email = value?.trim() ?? ''
  const [user, domain] = email.split('@')
  if (!user || !domain) return email ? '***' : ''
  return `${user.slice(0, 2)}***@${domain}`
}
