/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  executeWhatsAppTextAction,
  executeWhatsAppTemplateAction,
  executeCreateTaskAction,
} from '@/lib/automations/actions'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 10

type QueueRow = Tables<'automation_queue'>

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  const supabase = createAdminClient()

  // Buscar itens prontos para executar
  const { data: items, error } = await (supabase as any)
    .from('automation_queue')
    .select('*, automations(*), contacts(*)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_for', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[cron] erro ao buscar fila:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (items ?? []) as Array<QueueRow & {
    automations: Automation
    contacts: Tables<'contacts'>
  }>

  let processed = 0
  let succeeded = 0
  let failed = 0
  let retrying = 0

  await Promise.allSettled(rows.map(async (item) => {
    const automation = item.automations
    const contact = item.contacts

    if (!automation || !contact) {
      await (supabase as any)
        .from('automation_queue')
        .update({ status: 'failed', processed_at: new Date().toISOString(), error_message: 'Automacao ou contato nao encontrado' })
        .eq('id', item.id)
      failed++
      return
    }

    // Marcar como 'processing' atomicamente para evitar race condition
    const { error: lockError } = await (supabase as any)
      .from('automation_queue')
      .update({ status: 'processing', attempts: item.attempts + 1 })
      .eq('id', item.id)
      .eq('status', 'pending')

    if (lockError) return // outro cron pegou este item

    processed++

    let result: { success: boolean; skipped?: boolean; error?: string }
    try {
      switch (automation.action_type) {
        case 'send_whatsapp_text':
          result = await executeWhatsAppTextAction(automation, contact, item.workspace_id)
          break
        case 'send_whatsapp_template':
          result = await executeWhatsAppTemplateAction(automation, contact, item.workspace_id)
          break
        case 'create_task':
          result = await executeCreateTaskAction(automation, contact, item.workspace_id)
          break
        default:
          result = { success: false, error: `Acao desconhecida: ${automation.action_type}` }
      }
    } catch (err) {
      result = { success: false, error: String(err) }
    }

    const now = new Date().toISOString()

    if (result.success) {
      await (supabase as any)
        .from('automation_queue')
        .update({ status: 'done', processed_at: now })
        .eq('id', item.id)

      await (supabase as any).from('automation_logs').insert({
        workspace_id: item.workspace_id,
        automation_id: item.automation_id,
        contact_id: item.contact_id,
        status: 'success',
      })

      await (supabase as any)
        .from('automations')
        .update({ run_count: (automation.run_count ?? 0) + 1, last_run_at: now })
        .eq('id', automation.id)

      succeeded++
    } else {
      const newAttempts = item.attempts + 1
      const isFinal = newAttempts >= item.max_attempts

      await (supabase as any)
        .from('automation_queue')
        .update({
          status: isFinal ? 'failed' : 'pending',
          processed_at: isFinal ? now : null,
          error_message: result.error ?? null,
        })
        .eq('id', item.id)

      await (supabase as any).from('automation_logs').insert({
        workspace_id: item.workspace_id,
        automation_id: item.automation_id,
        contact_id: item.contact_id,
        status: 'failed',
        error_message: result.error ?? null,
      })

      if (isFinal) { failed++ } else { retrying++ }
    }
  }))

  console.log(`[cron] ${processed} items em ${Date.now() - start}ms`)
  return NextResponse.json({ processed, succeeded, failed, retrying })
}
