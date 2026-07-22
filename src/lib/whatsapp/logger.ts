type LogMeta = Record<string, unknown>

const SENSITIVE_KEYS = new Set([
  'token',
  'accessToken',
  'access_token',
  'whatsapp_token',
  'authorization',
  'body',
  'payload',
  'rawBody',
  'raw_body',
])

function sanitizeLogMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined

  const sanitized: LogMeta = {}

  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key) || value === undefined) {
      continue
    }

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      sanitized[key] = value
      continue
    }

    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === 'object' ? '[object]' : item
      )
      continue
    }

    sanitized[key] = '[object]'
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function formatLogMessage(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: LogMeta): string {
  const prefix = `[whatsapp:${level.toLowerCase()}] ${message}`
  const sanitized = sanitizeLogMeta(meta)

  if (!sanitized) {
    return prefix
  }

  return `${prefix} ${JSON.stringify(sanitized)}`
}

export function logWhatsAppInfo(message: string, meta?: LogMeta): void {
  console.info(formatLogMessage('INFO', message, meta))
}

export function logWhatsAppWarn(message: string, meta?: LogMeta): void {
  console.warn(formatLogMessage('WARN', message, meta))
}

export function logWhatsAppError(message: string, error?: unknown, meta?: LogMeta): void {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : undefined

  console.error(
    formatLogMessage('ERROR', message, {
      ...meta,
      error_message: errorMessage,
    })
  )
}
