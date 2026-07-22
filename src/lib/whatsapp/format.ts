export function normalizeWhatsAppPhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

export function maskWhatsAppToken(token: string | null): string {
  const normalized = token?.trim() ?? ''
  if (!normalized) {
    return ''
  }

  return '*'.repeat(Math.max(8, Math.min(normalized.length, 16)))
}

export function buildPhoneLookupCandidates(phone: string | null | undefined): string[] {
  const raw = (phone ?? '').trim()
  const normalized = normalizeWhatsAppPhone(raw)

  return Array.from(new Set([raw, raw ? `+${normalized}` : '', normalized].filter(Boolean)))
}

export function summarizeWhatsAppContent(content: string, maxLength = 100): string {
  const normalized = content.trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return normalized.slice(0, maxLength)
}

export function describeWhatsAppMedia(mediaType: string | null | undefined): string | null {
  if (!mediaType || mediaType === 'text') return null
  if (mediaType === 'image') return 'Imagem recebida'
  if (mediaType === 'audio') return 'Audio recebido'
  if (mediaType === 'document') return 'Documento recebido'
  if (mediaType === 'video') return 'Video recebido'
  if (mediaType === 'location') return 'Localizacao recebida'
  return `Midia recebida: ${mediaType}`
}

export function buildWhatsAppConversationPreview(params: {
  content: string | null
  mediaType: string | null
}): string {
  const content = params.content?.trim() ?? ''
  const mediaLabel = describeWhatsAppMedia(params.mediaType)

  if (!mediaLabel) {
    return content || 'Mensagem sem conteudo'
  }

  if (!content) {
    return mediaLabel
  }

  return `${mediaLabel}: ${content}`
}
