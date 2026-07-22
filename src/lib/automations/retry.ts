const DEFAULT_RETRY_BASE_SECONDS = 60
const DEFAULT_RETRY_MAX_SECONDS = 1800
const DEFAULT_JOB_LEASE_SECONDS = 300

const SENSITIVE_ENV_NAMES = [
  'CRON_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WHATSAPP_APP_SECRET',
  'META_CAPI_ACCESS_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TWILIO_API_KEY_SECRET',
  'TWILIO_AUTH_TOKEN',
]

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback

  return parsed
}

export function getAutomationRetryConfig() {
  return {
    baseSeconds: parsePositiveInteger(
      process.env.AUTOMATION_RETRY_BASE_SECONDS,
      DEFAULT_RETRY_BASE_SECONDS
    ),
    maxSeconds: parsePositiveInteger(
      process.env.AUTOMATION_RETRY_MAX_SECONDS,
      DEFAULT_RETRY_MAX_SECONDS
    ),
  }
}

export function getAutomationJobLeaseSeconds(): number {
  return parsePositiveInteger(
    process.env.AUTOMATION_JOB_LEASE_SECONDS,
    DEFAULT_JOB_LEASE_SECONDS
  )
}

export function calculateRetryDelaySeconds(attempt: number): number {
  const { baseSeconds, maxSeconds } = getAutomationRetryConfig()
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0

  return Math.min(
    baseSeconds * 2 ** Math.max(0, normalizedAttempt - 1),
    maxSeconds
  )
}

export function sanitizeAutomationError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Erro desconhecido')
  let message = raw.replace(/\s+/g, ' ').trim()

  for (const envName of SENSITIVE_ENV_NAMES) {
    const secret = process.env[envName]
    if (secret && secret.length >= 4) {
      message = message.split(secret).join('[redacted]')
    }
  }

  message = message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/(authorization|api[_-]?key|auth[_-]?token|secret|token)\s*[:=]\s*\S+/gi, '$1=[redacted]')

  return message.slice(0, 500) || 'Erro desconhecido'
}

export function isLikelyRetryableError(message: string): boolean {
  const value = message.toLowerCase()

  return (
    value.includes('timeout') ||
    value.includes('timed out') ||
    value.includes('econnreset') ||
    value.includes('econnrefused') ||
    value.includes('enotfound') ||
    value.includes('network') ||
    value.includes('conexao') ||
    value.includes('conexão') ||
    value.includes('temporar') ||
    value.includes('rate limit') ||
    value.includes('429') ||
    value.includes('500') ||
    value.includes('502') ||
    value.includes('503') ||
    value.includes('504')
  )
}
