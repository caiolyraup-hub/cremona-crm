/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildPhoneLookupCandidates,
  normalizeWhatsAppPhone,
  summarizeWhatsAppContent,
} from '@/lib/whatsapp/format'
import {
  logWhatsAppError,
  logWhatsAppInfo,
  logWhatsAppWarn,
} from '@/lib/whatsapp/logger'
import { getMediaUrl } from '@/lib/whatsapp/media'
import type {
  WhatsAppContact,
  WhatsAppMessage,
  WhatsAppMetadata,
  WhatsAppStatus,
} from '@/types/whatsapp'

interface ProcessIncomingMessageInput {
  message: WhatsAppMessage
  contact?: WhatsAppContact
  metadata: WhatsAppMetadata
}

function resolveMessageContent(message: WhatsAppMessage): string {
  if (message.type === 'text') {
    return message.text?.body ?? ''
  }

  if (message.type === 'image') {
    return message.image?.caption?.trim() ?? ''
  }

  if (message.type === 'audio') {
    return ''
  }

  if (message.type === 'document') {
    return message.document?.filename?.trim() ?? ''
  }

  if (message.type === 'video') {
    return message.video?.caption?.trim() ?? ''
  }

  if (message.type === 'location') {
    return [message.location?.name?.trim(), message.location?.address?.trim()]
      .filter(Boolean)
      .join(' - ')
  }

  return `[${message.type}]`
}

function resolveIncomingActivityContent(message: WhatsAppMessage, content: string): string {
  if (message.type === 'image') {
    return content
      ? `Imagem recebida via WhatsApp: ${summarizeWhatsAppContent(content)}`
      : 'Imagem recebida via WhatsApp'
  }

  if (message.type === 'audio') {
    return 'Audio recebido via WhatsApp'
  }

  if (message.type === 'document') {
    return content
      ? `Documento recebido via WhatsApp: ${summarizeWhatsAppContent(content)}`
      : 'Documento recebido via WhatsApp'
  }

  if (message.type === 'video') {
    return content
      ? `Video recebido via WhatsApp: ${summarizeWhatsAppContent(content)}`
      : 'Video recebido via WhatsApp'
  }

  if (message.type === 'location') {
    return content
      ? `Localizacao recebida via WhatsApp: ${summarizeWhatsAppContent(content)}`
      : 'Localizacao recebida via WhatsApp'
  }

  const activityContent = summarizeWhatsAppContent(content || `[${message.type}]`)
  return `Mensagem recebida via WhatsApp: ${activityContent}`
}

function resolveCreatedAt(timestamp: string): string {
  const parsed = Number(timestamp)
  if (Number.isFinite(parsed) && parsed > 0) {
    return new Date(parsed * 1000).toISOString()
  }

  return new Date().toISOString()
}

interface WorkspaceMatch {
  id: string
  whatsapp_token: string | null
}

async function findWorkspaceByMetadata(metadata: WhatsAppMetadata): Promise<WorkspaceMatch | null> {
  const supabase = createAdminClient()

  try {
    const { data, error } = await (supabase as any)
      .from('workspaces')
      .select('id, whatsapp_token')
      .eq('whatsapp_phone_number_id', metadata.phone_number_id)
      .limit(1)

    if (!error && data?.[0]?.id) {
      return { id: data[0].id as string, whatsapp_token: (data[0].whatsapp_token as string | null) ?? null }
    }
  } catch (error) {
    logWhatsAppError('Erro ao buscar workspace por phone_number_id.', error, {
      phone_number_id: metadata.phone_number_id,
    })
  }

  const candidates = Array.from(new Set(buildPhoneLookupCandidates(metadata.display_phone_number)))

  if (candidates.length === 0) {
    return null
  }

  const { data, error } = await (supabase as any)
    .from('workspaces')
    .select('id, whatsapp_token')
    .in('whatsapp_phone', candidates)
    .limit(1)

  if (error) {
    logWhatsAppError('Erro ao buscar workspace por telefone de fallback.', error, {
      phone_number_id: metadata.phone_number_id,
    })
    return null
  }

  const row = data?.[0]
  if (!row?.id) return null
  return { id: row.id as string, whatsapp_token: (row.whatsapp_token as string | null) ?? null }
}

async function findOrCreateContactId(
  workspaceId: string,
  message: WhatsAppMessage,
  contact?: WhatsAppContact
): Promise<string | null> {
  const supabase = createAdminClient()
  const normalizedPhone = normalizeWhatsAppPhone(contact?.wa_id ?? message.from)
  const rawPhone = contact?.wa_id ?? message.from

  const { data: normalizedMatch } = await supabase
    .from('contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('phone', normalizedPhone)
    .is('deleted_at', null)
    .limit(1)

  if (normalizedMatch?.[0]?.id) {
    return normalizedMatch[0].id
  }

  if (rawPhone && rawPhone !== normalizedPhone) {
    const { data: rawMatch } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('phone', rawPhone)
      .is('deleted_at', null)
      .limit(1)

    if (rawMatch?.[0]?.id) {
      return rawMatch[0].id
    }
  }

  const now = new Date().toISOString()
  const name = contact?.profile?.name?.trim() || rawPhone || 'Contato WhatsApp'
  const { data: created, error } = await (supabase as any)
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      name,
      phone: normalizedPhone || rawPhone || null,
      tags: [],
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .limit(1)

  if (error) {
    logWhatsAppError('Erro ao criar contato do WhatsApp.', error, {
      workspace_id: workspaceId,
      message_id: message.id,
    })
    return null
  }

  const contactId = created?.[0]?.id ?? null

  if (contactId) {
    logWhatsAppInfo('Contato criado a partir do webhook.', {
      workspace_id: workspaceId,
      contact_id: contactId,
      message_id: message.id,
    })
  }

  return contactId
}

export async function processIncomingMessage({
  message,
  contact,
  metadata,
}: ProcessIncomingMessageInput): Promise<void> {
  const supabase = createAdminClient()
  const workspace = await findWorkspaceByMetadata(metadata)

  if (!workspace) {
    logWhatsAppWarn('Workspace nao encontrado para webhook inbound.', {
      phone_number_id: metadata.phone_number_id,
      message_id: message.id,
      message_type: message.type,
    })
    return
  }

  const workspaceId = workspace.id

  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('whatsapp_message_id', message.id)
    .limit(1)

  if (existing && existing.length > 0) {
    logWhatsAppWarn('Mensagem duplicada ignorada.', {
      workspace_id: workspaceId,
      message_id: message.id,
      message_type: message.type,
    })
    return
  }

  const contactId = await findOrCreateContactId(workspaceId, message, contact)
  const content = resolveMessageContent(message)
  const createdAt = resolveCreatedAt(message.timestamp)

  const { data: insertedMessage, error: messageError } = await (supabase as any)
    .from('messages')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      whatsapp_message_id: message.id,
      direction: 'inbound',
      content,
      media_url: null,
      media_type: message.type,
      status: 'received',
      created_at: createdAt,
    })
    .select('id')
    .limit(1)

  if (messageError) {
    logWhatsAppError('Erro ao salvar mensagem inbound.', messageError, {
      workspace_id: workspaceId,
      contact_id: contactId,
      message_id: message.id,
      message_type: message.type,
    })
    return
  }

  logWhatsAppInfo('Mensagem inbound recebida.', {
    workspace_id: workspaceId,
    contact_id: contactId,
    message_id: message.id,
    message_type: message.type,
  })

  // Fetch media URL in background — fires after webhook returns 200 so Meta deadline is met.
  // Note: URLs from Meta expire in ~5 minutes. For permanent storage, re-download to Supabase
  // Storage would be needed. For now the URL is sufficient for immediate Inbox display.
  const savedMessageId = insertedMessage?.[0]?.id as string | undefined
  if (message.type === 'image' && message.image?.id && savedMessageId && workspace.whatsapp_token) {
    const mediaId = message.image.id
    const accessToken = workspace.whatsapp_token
    void (async () => {
      try {
        const url = await getMediaUrl(mediaId, accessToken)
        if (url) {
          await (supabase as any)
            .from('messages')
            .update({ media_url: url })
            .eq('id', savedMessageId)
        }
      } catch (e) {
        console.error('[webhook] media url error', e)
      }
    })()
  }

  if (!contactId) {
    return
  }

  const { error: activityError } = await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    user_id: null,
    type: 'whatsapp',
    content: resolveIncomingActivityContent(message, content),
    created_at: createdAt,
  })

  if (activityError) {
    logWhatsAppError('Erro ao salvar activity do WhatsApp.', activityError, {
      workspace_id: workspaceId,
      contact_id: contactId,
      message_id: message.id,
    })
  }
}

function resolveStatusValue(status: WhatsAppStatus): 'sent' | 'delivered' | 'read' | 'failed' | null {
  const normalized = status.status?.trim().toLowerCase()

  if (normalized === 'sent') return 'sent'
  if (normalized === 'delivered') return 'delivered'
  if (normalized === 'read') return 'read'
  if (normalized === 'failed') return 'failed'

  return null
}

export async function processWhatsAppStatusUpdate(status: WhatsAppStatus): Promise<void> {
  const nextStatus = resolveStatusValue(status)

  if (!nextStatus) {
    logWhatsAppWarn('Status callback desconhecido ignorado.', {
      message_id: status.id,
      status: status.status,
    })
    return
  }

  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('messages')
    .update({ status: nextStatus })
    .eq('whatsapp_message_id', status.id)
    .select('id, workspace_id, contact_id')
    .limit(1)

  if (error) {
    logWhatsAppError('Erro ao atualizar status da mensagem.', error, {
      message_id: status.id,
      status: nextStatus,
    })
    return
  }

  const updated = data?.[0]

  if (!updated?.id) {
    logWhatsAppWarn('Mensagem nao encontrada para status callback.', {
      message_id: status.id,
      status: nextStatus,
    })
    return
  }

  if (nextStatus === 'failed') {
    const firstError = status.errors?.[0]

    await (supabase as any).from('activities').insert({
      workspace_id: updated.workspace_id,
      contact_id: updated.contact_id,
      user_id: null,
      type: 'whatsapp',
      content: 'Falha na entrega de mensagem WhatsApp',
      created_at: new Date().toISOString(),
    })

    logWhatsAppWarn('Mensagem marcada como failed pela Meta.', {
      workspace_id: updated.workspace_id,
      contact_id: updated.contact_id,
      message_id: status.id,
      status: nextStatus,
      meta_error_code: firstError?.code,
      meta_error_title: firstError?.title,
    })
    return
  }

  logWhatsAppInfo('Status callback processado.', {
    workspace_id: updated.workspace_id,
    contact_id: updated.contact_id,
    message_id: status.id,
    status: nextStatus,
  })
}
