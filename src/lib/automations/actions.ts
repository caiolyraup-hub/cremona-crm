/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMetaWhatsAppMediaMessage, sendMetaWhatsAppTextMessage } from '@/lib/whatsapp/meta-api'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/templates'
import { normalizeWhatsAppPhone, summarizeWhatsAppContent } from '@/lib/whatsapp/format'
import { isWithinWhatsApp24hWindow } from '@/lib/whatsapp/conversation-window'
import { isLikelyRetryableError, sanitizeAutomationError } from './retry'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

type Contact = Tables<'contacts'>

export type AutomationActionResult = {
  success: boolean
  skipped?: boolean
  retryable?: boolean
  error?: string
}

function buildProviderFailure(error: string | null | undefined, fallback: string): AutomationActionResult {
  const sanitized = sanitizeAutomationError(error ?? fallback)
  const value = sanitized.toLowerCase()

  if (isLikelyRetryableError(sanitized)) {
    return { success: false, retryable: true, error: sanitized }
  }

  if (
    value.includes('token invalido') ||
    value.includes('token inválido') ||
    value.includes('phone number id invalido') ||
    value.includes('phone number id inválido') ||
    value.includes('numero do destinatario invalido') ||
    value.includes('número do destinatário inválido') ||
    value.includes('permissao insuficiente') ||
    value.includes('permissão insuficiente') ||
    value.includes('janela de 24 horas')
  ) {
    return { success: false, retryable: false, error: sanitized }
  }

  return { success: false, error: sanitized }
}

export function interpolateVars(template: string, contact: Contact): string {
  const map: Record<string, string> = {
    contact_name: contact.name,
    contact_phone: contact.phone ?? '',
    contact_company: contact.company ?? '',
    contact_email: contact.email ?? '',
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? `{{${key}}}`)
}

async function fetchWorkspaceWhatsApp(workspaceId: string) {
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('workspaces')
    .select('whatsapp_phone_number_id, whatsapp_token')
    .eq('id', workspaceId)
    .maybeSingle()
  return data as { whatsapp_phone_number_id: string | null; whatsapp_token: string | null } | null
}

async function fetchLastInboundAt(workspaceId: string, contactId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('messages')
    .select('created_at')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as { created_at: string } | null)?.created_at ?? null
}

export async function executeWhatsAppTextAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string
): Promise<AutomationActionResult> {
  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
  }

  const workspace = await fetchWorkspaceWhatsApp(workspaceId)
  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return { success: false, skipped: true, retryable: false, error: 'WhatsApp nao configurado' }
  }

  const phone = normalizeWhatsAppPhone(contact.phone)
  if (!phone) {
    return { success: false, skipped: true, retryable: false, error: 'Telefone invalido para WhatsApp' }
  }

  const lastInboundAt = await fetchLastInboundAt(workspaceId, contact.id)
  if (!isWithinWhatsApp24hWindow(lastInboundAt)) {
    // TODO: fora da janela deveria usar template — limitação atual documentada
    return { success: false, skipped: true, retryable: false, error: 'Janela de 24h fechada' }
  }

  const message = interpolateVars(automation.action_config.message ?? '', contact)
  const result = await sendMetaWhatsAppTextMessage({
    phoneNumberId: workspace.whatsapp_phone_number_id,
    accessToken: workspace.whatsapp_token,
    to: phone,
    text: message,
  })

  if (!result.success) {
    return buildProviderFailure(result.error, 'Erro ao enviar mensagem')
  }

  const supabase = createAdminClient()
  const createdAt = new Date().toISOString()

  await (supabase as any).from('messages').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    whatsapp_message_id: result.messageId ?? null,
    direction: 'outbound',
    content: message,
    media_url: null,
    media_type: 'text',
    status: 'sent',
    created_at: createdAt,
  })

  await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    user_id: null,
    type: 'whatsapp',
    content: `Automação enviou mensagem via WhatsApp: ${summarizeWhatsAppContent(message)}`,
    created_at: createdAt,
  })

  return { success: true }
}

export async function executeCreateTaskAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string
): Promise<AutomationActionResult> {
  const rawTitle = automation.action_config.title ?? 'Follow-up'
  const title = interpolateVars(rawTitle, contact)
  const daysOffset = Number(automation.action_config.days_offset ?? 0)
  const priority = automation.action_config.priority ?? 'medium'

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + daysOffset)
  const dueDateStr = dueDate.toISOString().split('T')[0]

  const supabase = createAdminClient()
  const { error } = await (supabase as any).from('tasks').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    title,
    priority,
    due_date: dueDateStr,
  })

  if (error) {
    return {
      success: false,
      retryable: true,
      error: sanitizeAutomationError('Erro ao criar tarefa: ' + error.message),
    }
  }

  return { success: true }
}

export async function executeWhatsAppTemplateAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string
): Promise<AutomationActionResult> {
  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
  }

  const workspace = await fetchWorkspaceWhatsApp(workspaceId)
  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return { success: false, skipped: true, retryable: false, error: 'WhatsApp nao configurado' }
  }

  const phone = normalizeWhatsAppPhone(contact.phone)
  if (!phone) {
    return { success: false, skipped: true, retryable: false, error: 'Telefone invalido para WhatsApp' }
  }

  const templateId = automation.action_config.template_id
  if (!templateId) {
    return { success: false, retryable: false, error: 'template_id nao configurado na automacao' }
  }

  const supabase = createAdminClient()
  const { data: templateRow } = await (supabase as any)
    .from('whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'approved')
    .eq('active', true)
    .maybeSingle()

  if (!templateRow) {
    return { success: false, skipped: true, retryable: false, error: 'Template nao encontrado ou nao aprovado' }
  }

  let variableDefaults: Record<string, string> = {}
  try {
    variableDefaults = JSON.parse(automation.action_config.variable_defaults ?? '{}')
  } catch { /* ignored */ }

  const vars: Array<{ index: number; label: string; default: string }> = templateRow.variables ?? []
  const parameters = vars.map((v: { index: number; label: string; default: string }) => {
    let text = variableDefaults[String(v.index)] ?? v.default ?? ''
    text = interpolateVars(text, contact)
    return { type: 'text' as const, text }
  })

  const result = await sendWhatsAppTemplate(
    workspace.whatsapp_phone_number_id,
    workspace.whatsapp_token,
    phone,
    {
      name: templateRow.name,
      language: templateRow.language ?? 'pt_BR',
      components: parameters.length > 0 ? [{ type: 'body' as const, parameters }] : [],
    }
  )

  if (!result.success) {
    return buildProviderFailure(result.error, 'Erro ao enviar template')
  }

  const renderedContent = (templateRow.body_text as string).replace(
    /\{\{(\d+)\}\}/g,
    (_: string, n: string) => {
      const raw = variableDefaults[n] ?? vars.find(v => v.index === Number(n))?.default ?? `{{${n}}}`
      return interpolateVars(raw, contact)
    }
  )

  const createdAt = new Date().toISOString()
  await (supabase as any).from('messages').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
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
    contact_id: contact.id,
    user_id: null,
    type: 'whatsapp',
    content: `Automação enviou template "${templateRow.display_name}" via WhatsApp`,
    created_at: createdAt,
  })

  return { success: true }
}

export async function executeWhatsAppMediaAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string
): Promise<AutomationActionResult> {
  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
  }

  const workspace = await fetchWorkspaceWhatsApp(workspaceId)
  if (!workspace?.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return { success: false, skipped: true, retryable: false, error: 'WhatsApp nao configurado' }
  }

  const phone = normalizeWhatsAppPhone(contact.phone)
  if (!phone) {
    return { success: false, skipped: true, retryable: false, error: 'Telefone invalido para WhatsApp' }
  }

  const mediaUrl = automation.action_config.media_url?.trim()
  const mediaType = automation.action_config.media_type?.trim()
  const filename = automation.action_config.filename?.trim()
  const caption = interpolateVars(automation.action_config.caption ?? '', contact)

  if (!mediaUrl || !mediaType || !['image', 'document', 'audio', 'video'].includes(mediaType)) {
    return { success: false, retryable: false, error: 'Midia nao configurada na automacao' }
  }

  try {
    const head = await fetch(mediaUrl, { method: 'HEAD', cache: 'no-store' })
    if (head.status !== 200) {
      const retryable = [429, 500, 502, 503, 504].includes(head.status)
      return {
        success: false,
        retryable,
        error: 'Arquivo de midia inacessivel. Verifique se o arquivo ainda existe no Supabase Storage.',
      }
    }
  } catch {
    return {
      success: false,
      retryable: true,
      error: 'Arquivo de midia inacessivel. Verifique se o arquivo ainda existe no Supabase Storage.',
    }
  }

  const result = await sendMetaWhatsAppMediaMessage({
    phoneNumberId: workspace.whatsapp_phone_number_id,
    accessToken: workspace.whatsapp_token,
    to: phone,
    mediaUrl,
    mediaType: mediaType as 'image' | 'document' | 'audio' | 'video',
    filename,
    caption,
  })

  if (!result.success) {
    return buildProviderFailure(result.error, 'Erro ao enviar midia')
  }

  const supabase = createAdminClient()
  const createdAt = new Date().toISOString()
  const content = caption || filename || `[${mediaType}]`

  await (supabase as any).from('messages').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    whatsapp_message_id: result.messageId ?? null,
    direction: 'outbound',
    content,
    media_url: mediaUrl,
    media_type: mediaType,
    status: 'sent',
    created_at: createdAt,
  })

  await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contact.id,
    user_id: null,
    type: 'whatsapp',
    content: `Automacao enviou midia via WhatsApp: ${summarizeWhatsAppContent(content)}`,
    created_at: createdAt,
  })

  return { success: true }
}
