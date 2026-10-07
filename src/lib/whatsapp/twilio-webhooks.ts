/* eslint-disable @typescript-eslint/no-explicit-any */
import twilio from 'twilio'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPhoneLookupCandidates, normalizeWhatsAppPhone } from './format'
import { normalizeTwilioWhatsAppAddress } from './providers'
import { persistWhatsAppMessage } from './messages'
import { enqueueLuccaInbound } from './lucca/inbound'
import { processLuccaQueue } from './lucca/worker'
import {
  describeTwilioStatusError,
  mapTwilioStatus,
  sanitizeProviderError,
  shouldUpdateMessageStatus,
} from './status'

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
  const { data: existingContact, error: contactLookupError } = await (supabase as any)
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .in('phone', candidates)
    .limit(1)
    .maybeSingle()
  if (contactLookupError) {
    console.error('[twilio-webhook] contact lookup failed', {
      workspace_id: workspaceId,
      provider_message_id: messageSid,
      error: sanitizeProviderError(contactLookupError.message),
    })
    return { status: 500, body: '' }
  }

  let contactId = existingContact?.id as string | undefined
  if (!contactId) {
    const profileName = payload.ProfileName?.trim()
    const { data: createdContact, error: contactCreateError } = await (supabase as any)
      .from('contacts')
      .insert({
        workspace_id: workspaceId,
        name: profileName || normalizedFromDigits || 'Contato WhatsApp',
        phone: `+${normalizedFromDigits}`,
      })
      .select('id')
      .maybeSingle()
    contactId = createdContact?.id as string | undefined
    if (!contactId && contactCreateError?.code === '23505') {
      const { data: concurrentContact } = await (supabase as any)
        .from('contacts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .in('phone', candidates)
        .limit(1)
        .maybeSingle()
      contactId = concurrentContact?.id as string | undefined
    }
    if (!contactId) {
      console.error('[twilio-webhook] contact persistence failed', {
        workspace_id: workspaceId,
        provider_message_id: messageSid,
        error: sanitizeProviderError(contactCreateError?.message ?? 'contact_not_created'),
      })
      return { status: 500, body: '' }
    }
  }

  const numMedia = Number(payload.NumMedia ?? 0)
  const mediaUrl = numMedia > 0 ? payload.MediaUrl0 ?? null : null
  const mediaType = mediaTypeFromTwilio(payload.MediaContentType0) ?? (mediaUrl ? 'document' : 'text')
  const body = payload.Body?.trim() || null

  const receivedAt = new Date().toISOString()
  const persisted = await persistWhatsAppMessage({
    workspaceId,
    contactId,
    provider: 'twilio',
    whatsappMessageId: messageSid,
    direction: 'inbound',
    content: body,
    mediaUrl,
    mediaType,
    status: 'received',
    senderType: 'contact',
    createdAt: receivedAt,
    activityContent: body
      ? `Mensagem recebida via WhatsApp: ${body.slice(0, 100)}`
      : 'Mensagem recebida via WhatsApp.',
  })

  if (persisted.error) {
    console.error('[twilio-webhook] inbound persistence failed', {
      workspace_id: workspaceId,
      provider_message_id: messageSid,
      error: sanitizeProviderError(persisted.error),
    })
    return { status: 500, body: '' }
  }

  if (!persisted.messageId) {
    return { status: 200, body: '' }
  }

  try {
    const durableReceivedAt = persisted.createdAt ?? receivedAt
    const queued = await enqueueLuccaInbound({
      workspaceId,
      contactId,
      contactPhone: from,
      sender,
      messageId: persisted.messageId,
      messageSid,
      messageText: body,
      mediaType,
      receivedAt: durableReceivedAt,
      payload,
    })
    if (queued.enqueued) {
      try {
        // Processa já nesta invocação para reduzir latência. O cron continua sendo
        // a recuperação durável caso a função termine ou algum provedor falhe.
        await processLuccaQueue({ qualificationId: queued.qualificationId })
      } catch (error) {
        console.error('[twilio-webhook] Lucca immediate processing failed; durable job retained', {
          workspace_id: workspaceId,
          contact_id: contactId,
          provider_message_id: messageSid,
          error: sanitizeProviderError(error instanceof Error ? error.message : String(error)),
        })
      }
    }
  } catch (error) {
    console.error('[twilio-webhook] Lucca durable enqueue failed', {
      workspace_id: workspaceId,
      contact_id: contactId,
      provider_message_id: messageSid,
      error: sanitizeProviderError(error instanceof Error ? error.message : String(error)),
    })
    return { status: 500, body: '' }
  }

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
  const errorMessage =
    sanitizeProviderError(payload.ErrorMessage || payload.ChannelStatusMessage) ??
    describeTwilioStatusError(errorCode)
  const supabase = createAdminClient()

  const { data: message } = await (supabase as any)
    .from('messages')
    .select('id, workspace_id, contact_id, status')
    .eq('provider', 'twilio')
    .eq('whatsapp_message_id', messageSid)
    .maybeSingle()

  if (!message?.id) {
    const { data: dispatch } = await (supabase as any)
      .from('whatsapp_dispatches')
      .select('id, workspace_id, contact_id, event_key')
      .eq('provider', 'twilio')
      .eq('provider_message_id', messageSid)
      .maybeSingle()

    if (!dispatch?.id) return { status: 200, body: '' }

    await (supabase as any).from('whatsapp_message_events').insert({
      workspace_id: dispatch.workspace_id,
      message_id: null,
      provider: 'twilio',
      provider_message_id: messageSid,
      status: payload.MessageStatus ?? nextStatus,
      error_code: errorCode,
      error_message: errorMessage,
    })

    if (String(dispatch.event_key).startsWith('lucca:notification:')) {
      const notificationStatus = nextStatus === 'failed'
        ? 'failed'
        : nextStatus === 'read'
          ? 'read'
          : nextStatus === 'delivered'
            ? 'delivered'
            : 'sent'
      const rank: Record<string, number> = {
        pending: 0, accepted: 1, sent: 2, delivered: 3, read: 4, failed: 5,
      }
      const { data: qualification } = await (supabase as any)
        .from('lucca_qualifications')
        .select('id, notification_status')
        .eq('workspace_id', dispatch.workspace_id)
        .eq('notification_message_sid', messageSid)
        .maybeSingle()
      if (
        qualification?.id &&
        (notificationStatus === 'failed' ||
          (rank[notificationStatus] ?? 0) >= (rank[qualification.notification_status] ?? 0))
      ) {
        await (supabase as any)
          .from('lucca_qualifications')
          .update({
            notification_status: notificationStatus,
            notification_error: notificationStatus === 'failed' ? errorMessage : null,
          })
          .eq('id', qualification.id)
      }
    }
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
