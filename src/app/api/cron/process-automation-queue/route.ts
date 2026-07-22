/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  executeWhatsAppMediaAction,
  executeWhatsAppTextAction,
  executeWhatsAppTemplateAction,
  executeCreateTaskAction,
} from '@/lib/automations/actions'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 10

type QueueRow = Tables<'automation_queue'>

function getJobContext(job: QueueRow) {
  return {
    job_id: job.id,
    event_key: job.event_key,
    automation_id: job.automation_id,
    contact_id: job.contact_id,
    workspace_id: job.workspace_id,
    status: job.status,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function markClaimedJobFailed(
  supabase: any,
  job: QueueRow,
  message: string,
  now = new Date().toISOString()
) {
  await supabase
    .from('automation_queue')
    .update({
      status: 'failed',
      processed_at: now,
      error_message: message,
    })
    .eq('id', job.id)
}

async function recordActionFailure(
  supabase: any,
  job: QueueRow,
  message: string,
  now = new Date().toISOString()
): Promise<'failed' | 'retrying'> {
  const isFinal = job.attempts >= job.max_attempts

  await supabase
    .from('automation_queue')
    .update({
      status: isFinal ? 'failed' : 'pending',
      processed_at: isFinal ? now : null,
      error_message: message,
    })
    .eq('id', job.id)

  await supabase.from('automation_logs').insert({
    workspace_id: job.workspace_id,
    automation_id: job.automation_id,
    contact_id: job.contact_id,
    status: 'failed',
    error_message: message,
  })

  return isFinal ? 'failed' : 'retrying'
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Buscar itens prontos para executar
  const { data: items, error } = await (supabase as any)
    .from('automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .lt('attempts', 3)
    .order('scheduled_for', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[cron] erro ao buscar fila:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (items ?? []) as QueueRow[]

  let processed = 0
  let succeeded = 0
  let failed = 0
  let retrying = 0

  await Promise.allSettled(rows.map(async (item) => {
    const claimNow = new Date().toISOString()
    const { data: claimedJob, error: claimError } = await (supabase as any)
      .from('automation_queue')
      .update({ status: 'processing', attempts: item.attempts + 1 })
      .eq('id', item.id)
      .eq('status', 'pending')
      .lte('scheduled_for', claimNow)
      .select('*')
      .maybeSingle()

    if (claimError) {
      console.error('[cron] erro ao adquirir job de automacao.', {
        ...getJobContext(item),
        error: claimError.message,
      })
      return
    }

    if (!claimedJob) {
      console.info('[cron] job de automacao ja adquirido por outro worker.', getJobContext(item))
      return
    }

    const job = claimedJob as QueueRow

    processed++

    const [
      { data: automationRow, error: automationError },
      { data: contactRow, error: contactError },
    ] = await Promise.all([
      (supabase as any)
        .from('automations')
        .select('*')
        .eq('id', job.automation_id)
        .maybeSingle(),
      (supabase as any)
        .from('contacts')
        .select('*')
        .eq('id', job.contact_id)
        .maybeSingle(),
    ])

    if (automationError || contactError) {
      const message = automationError?.message ?? contactError?.message ?? 'Erro ao buscar dados do job'
      console.error('[cron] erro ao buscar dados de automacao ou contato.', {
        ...getJobContext(job),
        error: message,
      })
      const state = await recordActionFailure(supabase, job, 'Erro ao buscar dados do job')
      if (state === 'failed') { failed++ } else { retrying++ }
      return
    }

    const automation = automationRow as Automation | null
    const contact = contactRow as Tables<'contacts'> | null

    if (!automation || !contact) {
      const message = 'Automacao ou contato nao encontrado'
      console.error('[cron] job de automacao sem relacao obrigatoria.', getJobContext(job))
      await markClaimedJobFailed(supabase, job, message)
      failed++
      return
    }

    if (
      automation.workspace_id !== job.workspace_id ||
      contact.workspace_id !== job.workspace_id
    ) {
      const message = 'Automacao ou contato pertence a outro workspace'
      console.error('[cron] isolamento de workspace violado em job de automacao.', {
        ...getJobContext(job),
        automation_workspace_id: automation.workspace_id,
        contact_workspace_id: contact.workspace_id,
      })
      await markClaimedJobFailed(supabase, job, message)
      failed++
      return
    }

    let result: { success: boolean; skipped?: boolean; error?: string }
    try {
      switch (automation.action_type) {
        case 'send_whatsapp_text':
          result = await executeWhatsAppTextAction(automation, contact, job.workspace_id)
          break
        case 'send_whatsapp_template':
          result = await executeWhatsAppTemplateAction(automation, contact, job.workspace_id)
          break
        case 'send_whatsapp_media':
          result = await executeWhatsAppMediaAction(automation, contact, job.workspace_id)
          break
        case 'create_task':
          result = await executeCreateTaskAction(automation, contact, job.workspace_id)
          break
        default:
          result = { success: false, error: `Acao desconhecida: ${automation.action_type}` }
      }
    } catch (err) {
      result = { success: false, error: errorMessage(err) }
    }

    const finishedAt = new Date().toISOString()

    if (result.success) {
      await (supabase as any)
        .from('automation_queue')
        .update({ status: 'done', processed_at: finishedAt })
        .eq('id', job.id)

      await (supabase as any).from('automation_logs').insert({
        workspace_id: job.workspace_id,
        automation_id: job.automation_id,
        contact_id: job.contact_id,
        status: 'success',
      })

      await (supabase as any)
        .from('automations')
        .update({ run_count: (automation.run_count ?? 0) + 1, last_run_at: finishedAt })
        .eq('id', automation.id)

      succeeded++
    } else {
      const state = await recordActionFailure(
        supabase,
        job,
        result.error ?? 'Erro desconhecido',
        finishedAt
      )

      if (state === 'failed') { failed++ } else { retrying++ }
    }
  }))

  console.info(`[cron] ${processed} items em ${Date.now() - start}ms`)
  return NextResponse.json({ processed, succeeded, failed, retrying })
}
