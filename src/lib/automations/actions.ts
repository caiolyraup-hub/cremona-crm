/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeWhatsAppPhone, summarizeWhatsAppContent } from '@/lib/whatsapp/format'
import { isWithinWhatsApp24hWindow } from '@/lib/whatsapp/conversation-window'
import { getWhatsAppProviderForWorkspace } from '@/lib/whatsapp/providers'
import type { SendWhatsAppResult, WhatsAppSendContext } from '@/lib/whatsapp/providers'
import { buildRequestFingerprint, sendWithDispatch } from '@/lib/whatsapp/dispatches'
import { persistWhatsAppMessage } from '@/lib/whatsapp/messages'
import { isLikelyRetryableError, sanitizeAutomationError } from './retry'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

type Contact = Tables<'contacts'>

export type AutomationActionResult = {
  success: boolean
  skipped?: boolean
  retryable?: boolean
  deliveryUnknown?: boolean
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
    value.includes('token inv') ||
    value.includes('phone number id invalido') ||
    value.includes('phone number id inv') ||
    value.includes('numero do destinatario invalido') ||
    value.includes('permissao insuficiente') ||
    value.includes('janela de 24 horas') ||
    value.includes('content sid') ||
    value.includes('credenciais twilio') ||
    value.includes('sender twilio')
  ) {
    return { success: false, retryable: false, error: sanitized }
  }

  return { success: false, error: sanitized }
}

function toAutomationResult(result: SendWhatsAppResult, fallback: string): AutomationActionResult {
  if (result.success) return { success: true, skipped: result.skipped }
  if (result.retryable !== undefined || result.skipped || result.deliveryUnknown) {
    return {
      success: false,
      skipped: result.skipped,
      retryable: result.deliveryUnknown ? false : result.retryable,
      deliveryUnknown: result.deliveryUnknown,
      error: sanitizeAutomationError(result.error ?? fallback),
    }
  }

  return buildProviderFailure(result.error, fallback)
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

function isEnabledFlag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'sim'].includes(String(value ?? '').trim().toLowerCase())
}

async function shouldSkipBecauseContactReplied(
  automation: Automation,
  workspaceId: string,
  contactId: string,
  context?: WhatsAppSendContext
): Promise<boolean> {
  if (!isEnabledFlag(automation.action_config.skip_if_inbound_since_event)) return false
  if (!context?.automationQueueCreatedAt) return false

  const lastInboundAt = await fetchLastInboundAt(workspaceId, contactId)
  if (!lastInboundAt) return false

  return new Date(lastInboundAt).getTime() > new Date(context.automationQueueCreatedAt).getTime()
}

function buildAutomationDispatchEventKey(
  automation: Automation,
  contact: Contact,
  context: WhatsAppSendContext | undefined,
  operation: string
): string {
  if (context?.eventKey) return context.eventKey
  return `automation:${automation.id}:${contact.id}:${operation}`
}

function parseJsonObject(value: string | undefined): Record<string, string> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as Record<string, string>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function buildTwilioTemplateVariables(config: Record<string, string>, contact: Contact) {
  const variables = parseJsonObject(
    config.variables ?? config.content_variables ?? config.variable_defaults
  )
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => [key, interpolateVars(String(value), contact)])
  )
}

async function resolveProviderResult(workspaceId: string) {
  const resolved = await getWhatsAppProviderForWorkspace(workspaceId)
  if (!resolved.provider || !resolved.workspace) {
    return {
      resolved,
      error: toAutomationResult(
        resolved.error ?? { success: false, retryable: false, error: 'WhatsApp nao configurado' },
        'WhatsApp nao configurado'
      ),
    }
  }

  return { resolved, error: null }
}

export async function executeWhatsAppTextAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string,
  context?: WhatsAppSendContext
): Promise<AutomationActionResult> {
  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
  }

  if (await shouldSkipBecauseContactReplied(automation, workspaceId, contact.id, context)) {
    return { success: false, skipped: true, retryable: false, error: 'Contato ja respondeu ao WhatsApp' }
  }

  const phone = normalizeWhatsAppPhone(contact.phone)
  if (!phone) {
    return { success: false, skipped: true, retryable: false, error: 'Telefone invalido para WhatsApp' }
  }

  const lastInboundAt = await fetchLastInboundAt(workspaceId, contact.id)
  if (!isWithinWhatsApp24hWindow(lastInboundAt)) {
    return { success: false, skipped: true, retryable: false, error: 'Janela de 24h fechada' }
  }

  const providerResult = await resolveProviderResult(workspaceId)
  if (providerResult.error) return providerResult.error

  const provider = providerResult.resolved.provider!
  const message = interpolateVars(automation.action_config.message ?? '', contact)
  const eventKey = buildAutomationDispatchEventKey(automation, contact, context, 'text')
  const result = await sendWithDispatch({
    workspaceId,
    contactId: contact.id,
    automationQueueId: context?.automationQueueId ?? null,
    eventKey,
    provider: provider.name,
    operation: 'text',
    requestFingerprint: buildRequestFingerprint({ to: phone, message }),
    send: () => provider.sendText({ to: phone, text: message, context }),
  })

  if (!result.success) return toAutomationResult(result, 'Erro ao enviar mensagem')

  const createdAt = new Date().toISOString()
  const persisted = await persistWhatsAppMessage({
    workspaceId,
    contactId: contact.id,
    provider: provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content: message,
    mediaUrl: null,
    mediaType: 'text',
    status: 'sent',
    createdAt,
    activityContent: `Automacao enviou mensagem via WhatsApp: ${summarizeWhatsAppContent(message)}`,
  })

  if (persisted.error) return { success: false, retryable: true, error: sanitizeAutomationError(persisted.error) }
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
  workspaceId: string,
  context?: WhatsAppSendContext
): Promise<AutomationActionResult> {
  if ((contact as Contact & { whatsapp_opt_in?: boolean | null }).whatsapp_opt_in === false) {
    return {
      success: false,
      skipped: true,
      retryable: false,
      error: 'Contato sem opt-in para WhatsApp',
    }
  }

  if (await shouldSkipBecauseContactReplied(automation, workspaceId, contact.id, context)) {
    return { success: false, skipped: true, retryable: false, error: 'Contato ja respondeu ao WhatsApp' }
  }

  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
  }

  const phone = normalizeWhatsAppPhone(contact.phone)
  if (!phone) {
    return { success: false, skipped: true, retryable: false, error: 'Telefone invalido para WhatsApp' }
  }

  const providerResult = await resolveProviderResult(workspaceId)
  if (providerResult.error) return providerResult.error

  const provider = providerResult.resolved.provider!
  const supabase = createAdminClient()
  const templateId = automation.action_config.template_id
  const contentSid = automation.action_config.content_sid ?? automation.action_config.twilio_content_sid

  let templateRow: any = null
  if (templateId) {
    const { data } = await (supabase as any)
      .from('whatsapp_templates')
      .select('*')
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)
      .eq('status', 'approved')
      .eq('active', true)
      .maybeSingle()
    templateRow = data

    if (!templateRow && provider.name === 'meta_cloud') {
      return { success: false, skipped: true, retryable: false, error: 'Template nao encontrado ou nao aprovado' }
    }
  } else if (provider.name === 'meta_cloud') {
    return { success: false, retryable: false, error: 'template_id nao configurado na automacao' }
  }

  const variableDefaults = parseJsonObject(automation.action_config.variable_defaults)
  const vars: Array<{ index: number; label: string; default: string }> = templateRow?.variables ?? []
  const parameters = vars.map((v) => {
    let text = variableDefaults[String(v.index)] ?? v.default ?? ''
    text = interpolateVars(text, contact)
    return { type: 'text' as const, text }
  })
  const metaTemplate = templateRow
    ? {
        name: templateRow.name,
        language: templateRow.language ?? 'pt_BR',
        components: parameters.length > 0 ? [{ type: 'body' as const, parameters }] : [],
      }
    : undefined
  const contentVariables = buildTwilioTemplateVariables(automation.action_config, contact)
  const eventKey = buildAutomationDispatchEventKey(automation, contact, context, 'template')

  const result = await sendWithDispatch({
    workspaceId,
    contactId: contact.id,
    automationQueueId: context?.automationQueueId ?? null,
    eventKey,
    provider: provider.name,
    operation: 'template',
    requestFingerprint: buildRequestFingerprint({ to: phone, contentSid, contentVariables, metaTemplate }),
    send: () => provider.sendTemplate({ to: phone, contentSid, contentVariables, metaTemplate, context }),
  })

  if (!result.success) return toAutomationResult(result, 'Erro ao enviar template')

  const renderedContent = templateRow
    ? (templateRow.body_text as string).replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
        const raw = variableDefaults[n] ?? vars.find(v => v.index === Number(n))?.default ?? `{{${n}}}`
        return interpolateVars(raw, contact)
      })
    : 'Template enviado via WhatsApp'

  const createdAt = new Date().toISOString()
  const persisted = await persistWhatsAppMessage({
    workspaceId,
    contactId: contact.id,
    provider: provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content: renderedContent,
    mediaUrl: null,
    mediaType: 'text',
    status: 'sent',
    createdAt,
    activityContent: `Automacao enviou template "${templateRow?.display_name ?? contentSid ?? 'Twilio'}" via WhatsApp`,
  })

  if (persisted.error) return { success: false, retryable: true, error: sanitizeAutomationError(persisted.error) }
  return { success: true }
}

export async function executeWhatsAppMediaAction(
  automation: Automation,
  contact: Contact,
  workspaceId: string,
  context?: WhatsAppSendContext
): Promise<AutomationActionResult> {
  if (!contact.phone) {
    return { success: false, skipped: true, retryable: false, error: 'Contato sem telefone' }
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

  const providerResult = await resolveProviderResult(workspaceId)
  if (providerResult.error) return providerResult.error

  const provider = providerResult.resolved.provider!
  const eventKey = buildAutomationDispatchEventKey(automation, contact, context, 'media')
  const result = await sendWithDispatch({
    workspaceId,
    contactId: contact.id,
    automationQueueId: context?.automationQueueId ?? null,
    eventKey,
    provider: provider.name,
    operation: 'media',
    requestFingerprint: buildRequestFingerprint({ to: phone, mediaUrl, mediaType, filename, caption }),
    send: () => provider.sendMedia({
      to: phone,
      mediaUrl,
      mediaType: mediaType as 'image' | 'document' | 'audio' | 'video',
      filename,
      caption,
      context,
    }),
  })

  if (!result.success) return toAutomationResult(result, 'Erro ao enviar midia')

  const createdAt = new Date().toISOString()
  const content = caption || filename || `[${mediaType}]`
  const persisted = await persistWhatsAppMessage({
    workspaceId,
    contactId: contact.id,
    provider: provider.name,
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content,
    mediaUrl,
    mediaType,
    status: 'sent',
    createdAt,
    activityContent: `Automacao enviou midia via WhatsApp: ${summarizeWhatsAppContent(content)}`,
  })

  if (persisted.error) return { success: false, retryable: true, error: sanitizeAutomationError(persisted.error) }
  return { success: true }
}
