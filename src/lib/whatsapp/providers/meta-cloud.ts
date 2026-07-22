import {
  sendMetaWhatsAppMediaMessage,
  sendMetaWhatsAppTextMessage,
} from '../meta-api'
import { sendWhatsAppTemplate } from '../templates'
import { normalizeWhatsAppPhone } from '../format'
import type {
  ResolvedWhatsAppWorkspace,
  SendMediaInput,
  SendTemplateInput,
  SendTextInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from './types'

function missingConfig(): SendWhatsAppResult {
  return {
    success: false,
    retryable: false,
    skipped: true,
    error: 'Workspace sem provedor Meta Cloud API configurado.',
  }
}

function toResult(result: { success: boolean; messageId?: string; error?: string | null }): SendWhatsAppResult {
  return result.success
    ? { success: true, messageId: result.messageId, providerStatus: 'accepted' }
    : { success: false, error: result.error ?? 'Erro ao enviar mensagem pela Meta.' }
}

export function createMetaCloudProvider(workspace: ResolvedWhatsAppWorkspace): WhatsAppProvider {
  return {
    name: 'meta_cloud',
    async sendText(input: SendTextInput): Promise<SendWhatsAppResult> {
      if (!workspace.whatsapp_phone_number_id || !workspace.whatsapp_token) return missingConfig()

      const to = normalizeWhatsAppPhone(input.to)
      if (!to) {
        return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      }

      return toResult(await sendMetaWhatsAppTextMessage({
        phoneNumberId: workspace.whatsapp_phone_number_id,
        accessToken: workspace.whatsapp_token,
        to,
        text: input.text,
      }))
    },
    async sendTemplate(input: SendTemplateInput): Promise<SendWhatsAppResult> {
      if (!workspace.whatsapp_phone_number_id || !workspace.whatsapp_token) return missingConfig()
      if (!input.metaTemplate) {
        return { success: false, retryable: false, error: 'Template Meta ausente na configuracao.' }
      }

      const to = normalizeWhatsAppPhone(input.to)
      if (!to) {
        return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      }

      return toResult(await sendWhatsAppTemplate(
        workspace.whatsapp_phone_number_id,
        workspace.whatsapp_token,
        to,
        input.metaTemplate
      ))
    },
    async sendMedia(input: SendMediaInput): Promise<SendWhatsAppResult> {
      if (!workspace.whatsapp_phone_number_id || !workspace.whatsapp_token) return missingConfig()

      const to = normalizeWhatsAppPhone(input.to)
      if (!to) {
        return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      }

      return toResult(await sendMetaWhatsAppMediaMessage({
        phoneNumberId: workspace.whatsapp_phone_number_id,
        accessToken: workspace.whatsapp_token,
        to,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        filename: input.filename ?? undefined,
        caption: input.caption ?? undefined,
      }))
    },
  }
}
