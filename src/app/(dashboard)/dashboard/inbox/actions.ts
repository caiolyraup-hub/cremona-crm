/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWhatsAppProviderForWorkspace } from '@/lib/whatsapp/providers'
import { normalizeWhatsAppPhone, summarizeWhatsAppContent } from '@/lib/whatsapp/format'
import { getLastInboundMessageAt } from '@/lib/whatsapp/queries'
import { getWhatsAppWindowStatus } from '@/lib/whatsapp/conversation-window'
import {
  buildManualDispatchEventKey,
  buildRequestFingerprint,
  sendWithDispatch,
} from '@/lib/whatsapp/dispatches'
import { persistWhatsAppMessage } from '@/lib/whatsapp/messages'
import type { Tables } from '@/types/database'

type ActionPayload = { error: string | null }

async function requireInboxAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { supabase, userId: user.id, error: 'Voce nao tem permissao para enviar mensagens neste workspace.' }
  }

  return { supabase, userId: user.id, error: null }
}

async function getContactPhone(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  contactId: string
) {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone, name, company, email')
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .is('deleted_at', null)
    .maybeSingle()

  return contact as Pick<Tables<'contacts'>, 'id' | 'phone' | 'name' | 'company' | 'email'> | null
}

export async function markConversationAsReadAction(
  workspaceId: string,
  contactId: string
): Promise<ActionPayload> {
  const access = await requireInboxAccess(workspaceId)
  if (access.error) return { error: access.error }

  const { error } = await (access.supabase as any)
    .from('messages')
    .update({ status: 'read' })
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .neq('status', 'read')

  if (error) return { error: 'Nao foi possivel marcar a conversa como lida.' }

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function sendWhatsAppMessageAction(
  workspaceId: string,
  contactId: string,
  text: string
): Promise<ActionPayload> {
  const access = await requireInboxAccess(workspaceId)
  if (access.error) return { error: access.error }

  const content = text.trim()
  if (!content) return { error: 'Digite uma mensagem antes de enviar.' }
  if (content.length > 4096) return { error: 'A mensagem deve ter no maximo 4096 caracteres.' }

  const contact = await getContactPhone(access.supabase, workspaceId, contactId)
  if (!contact?.phone) return { error: 'Este contato nao possui telefone cadastrado.' }

  const destinationPhone = normalizeWhatsAppPhone(contact.phone)
  if (!destinationPhone) return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }

  let lastInboundAt: string | null
  try {
    lastInboundAt = await getLastInboundMessageAt({ workspaceId, contactId })
  } catch {
    return { error: 'Nao foi possivel verificar a janela de atendimento deste contato.' }
  }

  if (!getWhatsAppWindowStatus(lastInboundAt).isOpen) {
    return {
      error:
        'A janela de atendimento de 24 horas esta fechada para este contato. Para enviar uma nova mensagem ativa, use um template aprovado.',
    }
  }

  const resolved = await getWhatsAppProviderForWorkspace(workspaceId)
  if (!resolved.provider) return { error: resolved.error?.error ?? 'Configure o WhatsApp antes de enviar mensagens.' }

  const eventKey = buildManualDispatchEventKey({ workspaceId, contactId, operation: 'text' })
  const result = await sendWithDispatch({
    workspaceId,
    contactId,
    eventKey,
    provider: resolved.provider.name,
    operation: 'text',
    requestFingerprint: buildRequestFingerprint({ to: destinationPhone, content }),
    send: () => resolved.provider!.sendText({ to: destinationPhone, text: content }),
  })

  if (!result.success) {
    return { error: result.deliveryUnknown ? 'Envio com aceite incerto na Twilio. Verifique os Messaging Logs antes de reenviar.' : result.error ?? 'Erro ao enviar mensagem.' }
  }

  const createdAt = new Date().toISOString()
  const persisted = await persistWhatsAppMessage({
    workspaceId,
    contactId,
    provider: resolved.provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content,
    mediaUrl: null,
    mediaType: 'text',
    status: 'sent',
    userId: access.userId,
    createdAt,
    activityContent: `Mensagem enviada via WhatsApp: ${summarizeWhatsAppContent(content)}`,
  })

  if (persisted.error) return { error: 'A mensagem foi enviada, mas nao foi possivel salvar o historico no CRM.' }

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function sendTemplateMessageAction(
  contactId: string,
  workspaceId: string,
  templateId: string,
  variableValues: Record<string, string>
): Promise<ActionPayload> {
  const access = await requireInboxAccess(workspaceId)
  if (access.error) return { error: access.error }

  const { data: templateRow } = await (access.supabase as any)
    .from('whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'approved')
    .eq('active', true)
    .maybeSingle()

  if (!templateRow) return { error: 'Template nao encontrado ou nao aprovado.' }

  const contact = await getContactPhone(access.supabase, workspaceId, contactId)
  if (!contact?.phone) return { error: 'Este contato nao possui telefone cadastrado.' }

  const destinationPhone = normalizeWhatsAppPhone(contact.phone)
  if (!destinationPhone) return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }

  const resolved = await getWhatsAppProviderForWorkspace(workspaceId)
  if (!resolved.provider) return { error: resolved.error?.error ?? 'Configure o WhatsApp antes de enviar templates.' }

  const contactVarMap: Record<string, string> = {
    contact_name: contact.name,
    contact_phone: contact.phone ?? '',
    contact_company: contact.company ?? '',
    contact_email: contact.email ?? '',
  }
  const vars: Array<{ index: number; label: string; default: string }> = templateRow.variables ?? []
  const parameters = vars.map(v => {
    let value = variableValues[String(v.index)] ?? ''
    if (!value) {
      value = (v.default ?? '').replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => contactVarMap[k] ?? '')
    }
    return { type: 'text' as const, text: value }
  })
  const contentVariables = Object.fromEntries(
    parameters.map((param, index) => [String(index + 1), param.text])
  )
  const contentSid = templateRow.content_sid ?? templateRow.twilio_content_sid ?? null
  const metaTemplate = {
    name: templateRow.name,
    language: templateRow.language ?? 'pt_BR',
    components: parameters.length > 0 ? [{ type: 'body' as const, parameters }] : [],
  }

  const eventKey = buildManualDispatchEventKey({ workspaceId, contactId, operation: 'template' })
  const result = await sendWithDispatch({
    workspaceId,
    contactId,
    eventKey,
    provider: resolved.provider.name,
    operation: 'template',
    requestFingerprint: buildRequestFingerprint({ to: destinationPhone, templateId, contentVariables }),
    send: () => resolved.provider!.sendTemplate({
      to: destinationPhone,
      contentSid,
      contentVariables,
      metaTemplate,
    }),
  })

  if (!result.success) return { error: result.error ?? 'Erro ao enviar template.' }

  const renderedContent = (templateRow.body_text as string).replace(
    /\{\{(\d+)\}\}/g,
    (_: string, n: string) => variableValues[n] ?? contactVarMap[`var_${n}`] ?? `{{${n}}}`
  )

  const createdAt = new Date().toISOString()
  await persistWhatsAppMessage({
    workspaceId,
    contactId,
    provider: resolved.provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content: renderedContent,
    mediaUrl: null,
    mediaType: 'text',
    status: 'sent',
    userId: access.userId,
    createdAt,
    activityContent: `Template enviado: ${templateRow.display_name}`,
  })

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function sendMediaMessageAction(params: {
  workspaceId: string
  contactId: string
  mediaUrl: string
  mediaType: 'image' | 'document' | 'audio' | 'video'
  filename?: string
  caption?: string
}): Promise<ActionPayload> {
  const access = await requireInboxAccess(params.workspaceId)
  if (access.error) return { error: access.error }

  const contact = await getContactPhone(access.supabase, params.workspaceId, params.contactId)
  if (!contact?.phone) return { error: 'Este contato nao possui telefone cadastrado.' }

  const destinationPhone = normalizeWhatsAppPhone(contact.phone)
  if (!destinationPhone) return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }

  const resolved = await getWhatsAppProviderForWorkspace(params.workspaceId)
  if (!resolved.provider) return { error: resolved.error?.error ?? 'Configure o WhatsApp antes de enviar midia.' }

  const eventKey = buildManualDispatchEventKey({
    workspaceId: params.workspaceId,
    contactId: params.contactId,
    operation: 'media',
  })
  const result = await sendWithDispatch({
    workspaceId: params.workspaceId,
    contactId: params.contactId,
    eventKey,
    provider: resolved.provider.name,
    operation: 'media',
    requestFingerprint: buildRequestFingerprint(params),
    send: () => resolved.provider!.sendMedia({
      to: destinationPhone,
      mediaUrl: params.mediaUrl,
      mediaType: params.mediaType,
      filename: params.filename,
      caption: params.caption,
    }),
  })

  if (!result.success) return { error: result.error ?? 'Erro ao enviar midia.' }

  const createdAt = new Date().toISOString()
  const content = params.caption || params.filename || `[${params.mediaType}]`
  await persistWhatsAppMessage({
    workspaceId: params.workspaceId,
    contactId: params.contactId,
    provider: resolved.provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content,
    mediaUrl: params.mediaUrl,
    mediaType: params.mediaType,
    status: 'sent',
    userId: access.userId,
    createdAt,
    activityContent: `Midia enviada via WhatsApp: ${summarizeWhatsAppContent(content)}`,
  })

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}
