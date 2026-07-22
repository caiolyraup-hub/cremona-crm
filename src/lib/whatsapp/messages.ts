/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { summarizeWhatsAppContent } from './format'
import type { WhatsAppProviderName } from './providers'

export async function persistWhatsAppMessage(params: {
  workspaceId: string
  contactId: string | null
  provider: WhatsAppProviderName
  whatsappMessageId: string | null
  direction: 'inbound' | 'outbound'
  content: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  status: string
  userId?: string | null
  activityContent?: string | null
  createdAt?: string
}): Promise<{ messageId: string | null; created: boolean; error?: string }> {
  const supabase = createAdminClient()
  const createdAt = params.createdAt ?? new Date().toISOString()
  const payload = {
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    whatsapp_message_id: params.whatsappMessageId,
    provider: params.provider,
    direction: params.direction,
    content: params.content,
    media_url: params.mediaUrl ?? null,
    media_type: params.mediaType ?? 'text',
    status: params.status,
    created_at: createdAt,
  }

  const { data, error } = await (supabase as any)
    .from('messages')
    .insert(payload)
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.code === '23505' && params.whatsappMessageId) {
      const { data: existing } = await (supabase as any)
        .from('messages')
        .select('id')
        .eq('whatsapp_message_id', params.whatsappMessageId)
        .maybeSingle()

      return { messageId: existing?.id ?? null, created: false }
    }

    return { messageId: null, created: false, error: error.message }
  }

  const messageId = (data as { id: string } | null)?.id ?? null
  if (messageId && params.activityContent !== null) {
    const content =
      params.activityContent ??
      `${params.direction === 'inbound' ? 'Mensagem recebida' : 'Mensagem enviada'} via WhatsApp: ${summarizeWhatsAppContent(params.content ?? '')}`

    await (supabase as any).from('activities').insert({
      workspace_id: params.workspaceId,
      contact_id: params.contactId,
      user_id: params.userId ?? null,
      type: 'whatsapp',
      content,
      created_at: createdAt,
    })
  }

  return { messageId, created: true }
}
