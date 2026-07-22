type MetaErrorPayload = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    error_data?: {
      details?: string
    }
  }
}

function extractMetaErrorParts(error: unknown): {
  message: string
  code?: number
  details?: string
} {
  if (!error || typeof error !== 'object') {
    return { message: '' }
  }

  if ('error' in error && error.error && typeof error.error === 'object') {
    const payload = error as MetaErrorPayload
    return {
      message: payload.error?.message?.trim() ?? '',
      code: payload.error?.code,
      details: payload.error?.error_data?.details?.trim(),
    }
  }

  if ('message' in error && typeof error.message === 'string') {
    return { message: error.message.trim() }
  }

  return { message: '' }
}

export function getMetaErrorMessage(error: unknown): string {
  const { message, code, details } = extractMetaErrorParts(error)
  const haystack = [message, details].filter(Boolean).join(' ').toLowerCase()

  if (code === 190 || haystack.includes('invalid oauth') || haystack.includes('access token')) {
    return 'Token invalido ou expirado.'
  }

  if (haystack.includes('phone number id') || haystack.includes('unsupported get request')) {
    return 'Phone Number ID invalido.'
  }

  if (
    haystack.includes('recipient') ||
    haystack.includes('not a valid whatsapp number') ||
    haystack.includes('invalid parameter') ||
    haystack.includes('outside the allowed list')
  ) {
    return 'Numero do destinatario invalido ou fora do sandbox.'
  }

  if (
    haystack.includes('permission') ||
    haystack.includes('permissions') ||
    haystack.includes('not authorized')
  ) {
    return 'Permissao insuficiente para acessar este numero.'
  }

  if (
    haystack.includes('24 hours') ||
    haystack.includes('24h') ||
    haystack.includes('outside the allowed window') ||
    haystack.includes('re-engagement message')
  ) {
    return 'A janela de 24 horas expirou. Sera necessario usar templates aprovados.'
  }

  return 'Erro desconhecido da Meta. Verifique as credenciais e tente novamente.'
}
