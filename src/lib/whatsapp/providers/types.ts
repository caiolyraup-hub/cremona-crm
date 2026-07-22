import type { Tables } from '@/types/database'

export type WhatsAppProviderName = 'meta_cloud' | 'twilio'

export type SendWhatsAppResult = {
  success: boolean
  messageId?: string
  providerStatus?: string
  retryable?: boolean
  deliveryUnknown?: boolean
  skipped?: boolean
  error?: string
  errorCode?: string
}

export type WhatsAppSendContext = {
  automationQueueId?: string | null
  eventKey?: string | null
  attempt?: number
  workspaceId: string
  contactId?: string | null
  automationId?: string | null
  userId?: string | null
}

export type SendTextInput = {
  to: string
  text: string
  context?: WhatsAppSendContext
}

export type SendTemplateInput = {
  to: string
  contentSid?: string | null
  contentVariables?: Record<string, string>
  metaTemplate?: {
    name: string
    language: string
    components?: Array<{
      type: 'body'
      parameters: Array<{ type: 'text'; text: string }>
    }>
  }
  context?: WhatsAppSendContext
}

export type SendMediaInput = {
  to: string
  mediaUrl: string
  mediaType: 'image' | 'document' | 'audio' | 'video'
  filename?: string | null
  caption?: string | null
  context?: WhatsAppSendContext
}

export type ResolvedWhatsAppWorkspace = Pick<
  Tables<'workspaces'>,
  | 'id'
  | 'whatsapp_provider'
  | 'whatsapp_phone_number_id'
  | 'whatsapp_business_account_id'
  | 'whatsapp_phone'
  | 'whatsapp_token'
  | 'twilio_whatsapp_from'
  | 'twilio_content_sid_new_lead'
>

export interface WhatsAppProvider {
  name: WhatsAppProviderName
  sendText(input: SendTextInput): Promise<SendWhatsAppResult>
  sendTemplate(input: SendTemplateInput): Promise<SendWhatsAppResult>
  sendMedia(input: SendMediaInput): Promise<SendWhatsAppResult>
}
