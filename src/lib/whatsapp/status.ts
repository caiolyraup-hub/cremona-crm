export type TwilioMessageStatus =
  | 'accepted'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'undelivered'
  | 'failed'

export type InternalMessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed'

const rank: Record<InternalMessageStatus, number> = {
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

export function mapTwilioStatus(status: string | null | undefined): InternalMessageStatus {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'delivered') return 'delivered'
  if (normalized === 'read') return 'read'
  if (normalized === 'failed' || normalized === 'undelivered') return 'failed'
  return 'sent'
}

export function shouldUpdateMessageStatus(
  current: string | null | undefined,
  next: InternalMessageStatus
): boolean {
  const currentStatus = (current ?? 'sent') as InternalMessageStatus
  if (!Object.prototype.hasOwnProperty.call(rank, currentStatus)) return true
  if (next === 'failed') return true
  return rank[next] >= rank[currentStatus]
}

export function sanitizeProviderError(value: string | null | undefined): string | null {
  const text = value?.trim()
  if (!text) return null
  return text
    .replace(/AC[a-zA-Z0-9]{20,}/g, 'AC***')
    .replace(/SK[a-zA-Z0-9]{20,}/g, 'SK***')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer ***')
    .slice(0, 500)
}
