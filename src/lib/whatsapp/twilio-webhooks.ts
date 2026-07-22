/* eslint-disable @typescript-eslint/no-explicit-any */
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPhoneLookupCandidates, normalizeWhatsAppPhone } from './format'
import { normalizeTwilioWhatsAppAddress } from './providers'
import { persistWhatsAppMessage } from './messages'
import { mapTwilioStatus, sanitizeProviderError, shouldUpdateMessageStatus } from './status'

type FormPayload = Record<string, string>

export function parseTwilioForm(body: string): FormPayload {
  const params = new URLSearchParams(body)
  const payload: FormPayload = {}
  params.forEach((value, key) => {
    payload[key] = value
  })
  return payload
}

export function validateTwilioWebhookSignature(params: {
  signature: string | null
  url: string
  payload: FormPayload
}): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  if (!authToken || !params.signature || !params.url) return false
  return twilio.validateRequest(authToken, params.signature, params.url, params.payload)
}

function requireMatchingAccount(payload: FormPayload): boolean {
  const expected = process.env.TWILIO_ACCOUNT_SID?.trim()
  return Boolean(expected && payload.AccountSid === expected)
}

function mediaTypeFromTwilio(contentType: string | null | undefined): string | null {
  const value = contentType?.toLowerCase() ?? ''
  if (value.startsWith('image/')) return 'image'
  if (value.startsWith('audio/')) return 'audio'
  if (value.startsWith('video/')) return 'video'
  if (value) return 'document'
  return null
}

export async function handleTwilioInboundWebhook(payload: FormPayload) {
  if (!requireMatchingAccount(payload)) {
    return { status: 403, body: '' }
  }

  const sender = normalizeTwilioWhatsAppAddress(payload.To)
  const from = normalizeTwilioWhatsAppAddress(payload.From)
  const messageSid = payload.MessageSid?.trim()
  if (!sender || !from || !messageSid) {
    return { status: 400, body: '' }
  }

  const supabase = createAdminClient()
  const { data: workspace } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('twilio_whatsapp_from', sender)
    .eq('whatsapp_provider', 'twilio')
    .maybeSingle()

  if (!workspace?.id) {
    console.warn('[twilio-webhook] workspace not found for sender', sender.replace(/\d(?=\d{4})/g, '*'))
    return { status: 200, body: '' }
  }

  const workspaceId = workspace.id as string
  const normalizedFromDigits = normalizeWhatsAppPhone(from)
  const candidates = buildPhoneLookupCandidates(normalizedFromDigits)
  const { data: existingContact } = await (supabase as any)
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .in('phone', candidates)
    .limit(1)
    .maybeSingle()

  let contactId = existingContact?.id as string | undefined
  if (!contactId) {
    const profileName = payload.ProfileName?.trim()
    const { data: createdContact } = await (supabase as any)
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        name: profileName || normalizedFromDigits || 'Contato WhatsApp',
        phone: `+${normalizedFromDigits}`,
      })
      .select('id')
      .maybeSingle()
    contactId = createdContact?.id as string | undefined
  }

  const numMedia = Number(payload.NumMedia ?? 0)
  const mediaUrl = numMedia > 0 ? payload.MediaUrl0 ?? null : null
  const mediaType = mediaTypeFromTwilio(payload.MediaContentType0) ?? (mediaUrl ? 'document' : 'text')
  const body = payload.Body?.trim() || null

  await persistWhatsAppMessage({
    workspaceId,
    contactId: contactId ?? null,
    provider: 'twilio',
    whatsappMessageId: messageSid,
    direction: 'inbound',
    content: body,
    mediaUrl,
    mediaType,
    status: 'received',
    activityContent: body
      ? `Mensagem recebida via WhatsApp: ${body.slice(0, 100)}`
      : 'Mensagem recebida via WhatsApp.',
  })

  return { status: 200, body: '' }
}

export async function handleTwilioStatusWebhook(payload: FormPayload) {
  if (!requireMatchingAccount(payload)) {
    return { status: 403, body: '' }
  }

  const messageSid = payload.MessageSid?.trim()
  if (!messageSid) return { status: 400, body: '' }

  const nextStatus = mapTwilioStatus(payload.MessageStatus)
  const errorCode = sanitizeProviderError(payload.ErrorCode)
  const errorMessage = sanitizeProviderError(payload.ErrorMessage || payload.ChannelStatusMessage)
  const supabase = createAdminClient()

  const { data: message } = await (supabase as any)
    .from('messages')
    .select('id, workspace_id, contact_id, status')
    .eq('provider', 'twilio')
    .eq('whatsapp_message_id', messageSid)
    .maybeSingle()

  if (!message?.id) {
    return { status: 200, body: '' }
  }

  await (supabase as any).from('whatsapp_message_events').insert({
    workspace_id: message.workspace_id,
    message_id: message.id,
    provider: 'twilio',
    provider_message_id: messageSid,
    status: payload.MessageStatus ?? nextStatus,
    error_code: errorCode,
    error_message: errorMessage,
  })

  if (shouldUpdateMessageStatus(message.status, nextStatus)) {
    await (supabase as any)
      .from('messages')
      .update({ status: nextStatus })
      .eq('id', message.id)
      .eq('workspace_id', message.workspace_id)
  }

  if (nextStatus === 'failed' && errorMessage) {
    await (supabase as any).from('activities').insert({
      workspace_id: message.workspace_id,
      contact_id: message.contact_id,
      user_id: null,
      type: 'whatsapp',
      content: `Falha Twilio no WhatsApp: ${errorMessage}`,
    })
  }

  return { status: 200, body: '' }
}
