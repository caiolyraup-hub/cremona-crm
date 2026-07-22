const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000

export type WhatsAppWindowStatus = {
  isOpen: boolean
  expiresAt: string | null
  minutesRemaining: number | null
  label: string
}

function parseInboundDate(lastInboundAt: string | null): Date | null {
  if (!lastInboundAt) {
    return null
  }

  const parsedDate = new Date(lastInboundAt)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate
}

export function isWithinWhatsApp24hWindow(lastInboundAt: string | null): boolean {
  const inboundDate = parseInboundDate(lastInboundAt)

  if (!inboundDate) {
    return false
  }

  return Date.now() - inboundDate.getTime() <= WHATSAPP_WINDOW_MS
}

export function getWhatsAppWindowStatus(lastInboundAt: string | null): WhatsAppWindowStatus {
  const inboundDate = parseInboundDate(lastInboundAt)

  if (!inboundDate) {
    return {
      isOpen: false,
      expiresAt: null,
      minutesRemaining: null,
      label: 'Sem janela ativa',
    }
  }

  const expiresAtDate = new Date(inboundDate.getTime() + WHATSAPP_WINDOW_MS)
  const expiresAt = expiresAtDate.toISOString()
  const isOpen = isWithinWhatsApp24hWindow(lastInboundAt)

  if (!isOpen) {
    return {
      isOpen: false,
      expiresAt,
      minutesRemaining: 0,
      label: 'Janela fechada',
    }
  }

  return {
    isOpen: true,
    expiresAt,
    minutesRemaining: Math.max(0, Math.ceil((expiresAtDate.getTime() - Date.now()) / 60000)),
    label: 'Janela aberta',
  }
}
