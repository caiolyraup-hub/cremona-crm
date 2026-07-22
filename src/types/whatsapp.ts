export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'document'
  | 'video'
  | 'location'
  | (string & {})

export type WhatsAppMessageDirection = 'inbound' | 'outbound'

export type WhatsAppMessageStatus =
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | (string & {})

export interface WhatsAppMetadata {
  display_phone_number: string
  phone_number_id: string
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppTextMessage {
  body: string
}

export interface WhatsAppImageMessage {
  id: string
  mime_type: string
  sha256: string
  caption?: string
}

export interface WhatsAppAudioMessage {
  id: string
  mime_type: string
  sha256: string
}

export interface WhatsAppDocumentMessage {
  id: string
  mime_type: string
  sha256: string
  filename?: string
}

export interface WhatsAppVideoMessage {
  id: string
  mime_type: string
  sha256: string
  caption?: string
}

export interface WhatsAppLocationMessage {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: WhatsAppMessageType
  text?: WhatsAppTextMessage
  image?: WhatsAppImageMessage
  audio?: WhatsAppAudioMessage
  document?: WhatsAppDocumentMessage
  video?: WhatsAppVideoMessage
  location?: WhatsAppLocationMessage
}

export interface WhatsAppStatus {
  id: string
  status: WhatsAppMessageStatus
  timestamp: string
  recipient_id: string
  errors?: Array<{
    code?: number
    title?: string
    message?: string
    error_data?: {
      details?: string
    }
  }>
}

export interface WhatsAppWebhookValue {
  messaging_product: string
  metadata?: WhatsAppMetadata
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: WhatsAppStatus[]
}

export interface WhatsAppWebhookChange {
  field: string
  value?: WhatsAppWebhookValue
}

export interface WhatsAppWebhookEntry {
  id: string
  changes?: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookPayload {
  object?: string
  entry?: WhatsAppWebhookEntry[]
}

// ─── Template types ──────────────────────────────────────────────────────────

export type WhatsAppTemplateParameter =
  | { type: 'text'; text: string }
  | {
      type: 'currency'
      currency: {
        fallback_text: string
        code: string
        amount_1000: number
      }
    }
  | {
      type: 'date_time'
      date_time: {
        fallback_text: string
      }
    }

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters?: WhatsAppTemplateParameter[]
}

export interface WhatsAppTemplate {
  name: string
  language: string
  components?: WhatsAppTemplateComponent[]
}

export interface SendTemplateResult {
  success: boolean
  messageId?: string
  error?: string
}
