/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceByIdCompatible } from '@/lib/workspace-compat'
import { getWhatsAppWindowStatus } from '@/lib/whatsapp/conversation-window'
import { sendMetaWhatsAppMediaMessage, sendMetaWhatsAppTextMessage } from '@/lib/whatsapp/meta-api'
import { normalizeWhatsAppPhone, summarizeWhatsAppContent } from '@/lib/whatsapp/format'
import { getLastInboundMessageAt } from '@/lib/whatsapp/queries'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/templates'
import type { Tables } from '@/types/database'

export async function markConversationAsReadAction(
  workspaceId: string,
  contactId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { error: 'Voce nao tem permissao para atualizar esta conversa.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('messages')
    .update({ status: 'read' })
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .neq('status', 'read')

  if (error) {
    return { error: 'Nao foi possivel marcar a conversa como lida.' }
  }

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')

  return { error: null }
}

export async function sendWhatsAppMessageAction(
  workspaceId: string,
  contactId: string,
  text: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { error: 'Voce nao tem permissao para enviar mensagens neste workspace.' }
  }

  const content = text.trim()
  if (!content) {
    return { error: 'Digite uma mensagem antes de enviar.' }
  }

  if (content.length > 4096) {
    return { error: 'A mensagem deve ter no maximo 4096 caracteres.' }
  }

  const { workspace, error: workspaceError, usesLegacyWhatsAppConfigSchema } =
    await getWorkspaceByIdCompatible(supabase, workspaceId)

  if (workspaceError) {
    return { error: workspaceError.message }
  }

  if (usesLegacyWhatsAppConfigSchema) {
    return { error: 'A configuracao nova do WhatsApp ainda nao existe no banco deste ambiente.' }
  }

  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return { error: 'Configure o WhatsApp antes de enviar mensagens.' }
  }

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone')
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .is('deleted_at', null)
    .maybeSingle()

  const resolvedContact = contact as Pick<Tables<'contacts'>, 'id' | 'phone'> | null

  if (!resolvedContact?.phone) {
    return { error: 'Este contato nao possui telefone cadastrado.' }
  }

  const destinationPhone = normalizeWhatsAppPhone(resolvedContact.phone)
  if (!destinationPhone) {
    return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }
  }

  let lastInboundAt: string | null

  try {
    lastInboundAt = await getLastInboundMessageAt({
      workspaceId,
      contactId,
    })
  } catch {
    return { error: 'Nao foi possivel verificar a janela de atendimento deste contato.' }
  }

  const windowStatus = getWhatsAppWindowStatus(lastInboundAt)

  if (!windowStatus.isOpen) {
    return {
      error:
        'A janela de atendimento de 24 horas esta fechada para este contato. Para enviar uma nova mensagem ativa, sera necessario usar um template aprovado pela Meta.',
    }
  }

  const result = await sendMetaWhatsAppTextMessage({
    phoneNumberId: workspace.whatsapp_phone_number_id,
    accessToken: workspace.whatsapp_token,
    to: destinationPhone,
    text: content,
  })

  if (!result.success) {
    return { error: result.error }
  }

  const createdAt = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertMessageError } = await (supabase as any)
    .from('messages')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      whatsapp_message_id: result.messageId ?? null,
      direction: 'outbound',
      content,
      media_url: null,
      media_type: 'text',
      status: 'sent',
      created_at: createdAt,
    })

  if (insertMessageError) {
    return { error: 'A mensagem foi enviada, mas nao foi possivel salvar o historico no CRM.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('activities')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      user_id: user.id,
      type: 'whatsapp',
      content: `Mensagem enviada via WhatsApp: ${summarizeWhatsAppContent(content)}`,
      created_at: createdAt,
    })

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')

  return { error: null }
}

export async function sendTemplateMessageAction(
  contactId: string,
  workspaceId: string,
  templateId: string,
  variableValues: Record<string, string>
): Promise<{ error: string | null }> {
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

  if (!member) return { error: 'Sem permissao para enviar mensagens neste workspace.' }

  const { data: templateRow } = await (supabase as any)
    .from('whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'approved')
    .eq('active', true)
    .maybeSingle()

  if (!templateRow) return { error: 'Template nao encontrado ou nao aprovado.' }

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone, name, company, email')
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .is('deleted_at', null)
    .maybeSingle()

  const resolvedContact = contact as Pick<Tables<'contacts'>, 'id' | 'phone' | 'name' | 'company' | 'email'> | null
  if (!resolvedContact?.phone) return { error: 'Este contato nao possui telefone cadastrado.' }

  const destinationPhone = normalizeWhatsAppPhone(resolvedContact.phone)
  if (!destinationPhone) return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }

  const { workspace, error: workspaceError, usesLegacyWhatsAppConfigSchema } =
    await getWorkspaceByIdCompatible(supabase, workspaceId)

  if (workspaceError) return { error: workspaceError.message }
  if (usesLegacyWhatsAppConfigSchema) return { error: 'Configuracao nova do WhatsApp nao existe no banco deste ambiente.' }
  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) return { error: 'Configure o WhatsApp antes de enviar templates.' }

  const contactVarMap: Record<string, string> = {
    contact_name: resolvedContact.name,
    contact_phone: resolvedContact.phone ?? '',
    contact_company: resolvedContact.company ?? '',
    contact_email: resolvedContact.email ?? '',
  }

  const vars: Array<{ index: number; label: string; default: string }> = templateRow.variables ?? []
  const parameters = vars.map(v => {
    let text = variableValues[String(v.index)] ?? ''
    if (!text) {
      text = (v.default ?? '').replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => contactVarMap[k] ?? '')
    }
    return { type: 'text' as const, text }
  })

  const result = await sendWhatsAppTemplate(
    workspace.whatsapp_phone_number_id,
    workspace.whatsapp_token,
    destinationPhone,
    {
      name: templateRow.name,
      language: templateRow.language ?? 'pt_BR',
      components: parameters.length > 0 ? [{ type: 'body' as const, parameters }] : [],
    }
  )

  if (!result.success) return { error: result.error ?? 'Erro ao enviar template.' }

  const createdAt = new Date().toISOString()
  const renderedContent = (templateRow.body_text as string).replace(
    /\{\{(\d+)\}\}/g,
    (_: string, n: string) => variableValues[n] ?? contactVarMap[`var_${n}`] ?? `{{${n}}}`
  )

  await (supabase as any).from('messages').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    whatsapp_message_id: result.messageId ?? null,
    direction: 'outbound',
    content: renderedContent,
    media_url: null,
    media_type: 'text',
    status: 'sent',
    created_at: createdAt,
  })

  await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    user_id: user.id,
    type: 'whatsapp',
    content: `Template enviado: ${templateRow.display_name}`,
    created_at: createdAt,
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
}): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return { error: 'Sem permissao para enviar mensagens neste workspace.' }

  const { workspace, error: workspaceError, usesLegacyWhatsAppConfigSchema } =
    await getWorkspaceByIdCompatible(supabase, params.workspaceId)

  if (workspaceError) return { error: workspaceError.message }
  if (usesLegacyWhatsAppConfigSchema) return { error: 'Configuracao nova do WhatsApp nao existe no banco deste ambiente.' }
  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) return { error: 'Configure o WhatsApp antes de enviar midia.' }

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, phone')
    .eq('workspace_id', params.workspaceId)
    .eq('id', params.contactId)
    .is('deleted_at', null)
    .maybeSingle()

  const resolvedContact = contact as Pick<Tables<'contacts'>, 'id' | 'phone'> | null
  if (!resolvedContact?.phone) return { error: 'Este contato nao possui telefone cadastrado.' }

  const destinationPhone = normalizeWhatsAppPhone(resolvedContact.phone)
  if (!destinationPhone) return { error: 'O telefone deste contato esta invalido para envio via WhatsApp.' }

  const result = await sendMetaWhatsAppMediaMessage({
    phoneNumberId: workspace.whatsapp_phone_number_id,
    accessToken: workspace.whatsapp_token,
    to: destinationPhone,
    mediaUrl: params.mediaUrl,
    mediaType: params.mediaType,
    filename: params.filename,
    caption: params.caption,
  })

  if (!result.success) return { error: result.error ?? 'Erro ao enviar midia.' }

  const createdAt = new Date().toISOString()
  const content = params.caption || params.filename || `[${params.mediaType}]`
  await (supabase as any).from('messages').insert({
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    whatsapp_message_id: result.messageId ?? null,
    direction: 'outbound',
    content,
    media_url: params.mediaUrl,
    media_type: params.mediaType,
    status: 'sent',
    created_at: createdAt,
  })

  await (supabase as any).from('activities').insert({
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    user_id: user.id,
    type: 'whatsapp',
    content: `Midia enviada via WhatsApp: ${summarizeWhatsAppContent(content)}`,
    created_at: createdAt,
  })

  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}
