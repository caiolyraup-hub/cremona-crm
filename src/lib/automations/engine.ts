/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import {
  executeCreateTaskAction,
  executeWhatsAppMediaAction,
  executeWhatsAppTemplateAction,
  executeWhatsAppTextAction,
} from './actions'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

export type AutomationEvent =
  | { type: 'stage_enter' | 'stage_exit'; workspaceId: string; contactId: string; stageId: string }
  | { type: 'contact_created'; workspaceId: string; contactId: string }

export async function runAutomationsForEvent(event: AutomationEvent): Promise<void> {
  try {
    const supabase = createAdminClient()

    let query = (supabase as any)
      .from('automations')
      .select('*')
      .eq('workspace_id', event.workspaceId)
      .eq('active', true)
      .eq('trigger_type', event.type)

    if (event.type === 'stage_enter' || event.type === 'stage_exit') {
      query = query.eq("trigger_config->>'stage_id'", event.stageId)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('[automations] erro ao buscar automacoes:', error.message)
      return
    }

    const automations = (rows ?? []) as Automation[]
    if (automations.length === 0) return

    await Promise.allSettled(
      automations.map(automation => executeAutomation(automation, event))
    )
  } catch (err) {
    console.error('[automations] erro inesperado no motor:', err)
  }
}

async function executeAutomation(automation: Automation, event: AutomationEvent): Promise<void> {
  const supabase = createAdminClient()

  const { data: contactRow } = await (supabase as any)
    .from('contacts')
    .select('*')
    .eq('id', event.contactId)
    .eq('workspace_id', event.workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  const contact = contactRow as Tables<'contacts'> | null
  if (!contact) {
    await logExecution(automation, event, 'skipped', 'Contato nao encontrado')
    return
  }

  if (automation.delay_minutes > 0) {
    const scheduledFor = new Date()
    scheduledFor.setMinutes(scheduledFor.getMinutes() + automation.delay_minutes)
    await (supabase as any).from('automation_queue').insert({
      workspace_id: event.workspaceId,
      automation_id: automation.id,
      contact_id: event.contactId,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending',
    })
    await logExecution(automation, event, 'skipped',
      `Agendada para execucao em ${automation.delay_minutes} minutos (${scheduledFor.toLocaleString('pt-BR')})`)
    return
  }

  const { count: recentSuccessCount } = await (supabase as any)
    .from('automation_logs')
    .select('id', { count: 'exact', head: true })
    .eq('automation_id', automation.id)
    .eq('contact_id', event.contactId)
    .eq('status', 'success')
    .gt('executed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  if ((recentSuccessCount ?? 0) > 0) {
    await logExecution(
      automation,
      event,
      'skipped',
      'Execucao duplicada evitada (ja executada nos ultimos 5 minutos)'
    )
    return
  }

  let result: { success: boolean; skipped?: boolean; error?: string }

  switch (automation.action_type) {
    case 'send_whatsapp_text':
      result = await executeWhatsAppTextAction(automation, contact, event.workspaceId)
      break
    case 'send_whatsapp_template':
      result = await executeWhatsAppTemplateAction(automation, contact, event.workspaceId)
      break
    case 'send_whatsapp_media':
      result = await executeWhatsAppMediaAction(automation, contact, event.workspaceId)
      break
    case 'create_task':
      result = await executeCreateTaskAction(automation, contact, event.workspaceId)
      break
    default:
      result = { success: false, skipped: true, error: `Acao desconhecida: ${automation.action_type}` }
  }

  const status = result.success ? 'success' : result.skipped ? 'skipped' : 'failed'
  await logExecution(automation, event, status, result.error)

  if (result.success) {
    await (supabase as any)
      .from('automations')
      .update({ run_count: automation.run_count + 1, last_run_at: new Date().toISOString() })
      .eq('id', automation.id)
  }
}

async function logExecution(
  automation: Automation,
  event: AutomationEvent,
  status: 'success' | 'failed' | 'skipped',
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await (supabase as any).from('automation_logs').insert({
      workspace_id: event.workspaceId,
      automation_id: automation.id,
      contact_id: event.contactId,
      status,
      error_message: errorMessage ?? null,
    })
  } catch (err) {
    console.error('[automations] erro ao registrar log:', err)
  }
}
