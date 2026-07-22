/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  executeWhatsAppMediaAction,
  executeWhatsAppTextAction,
  executeWhatsAppTemplateAction,
  executeCreateTaskAction,
  type AutomationActionResult,
} from '@/lib/automations/actions'
import {
  calculateRetryDelaySeconds,
  getAutomationJobLeaseSeconds,
  isLikelyRetryableError,
  sanitizeAutomationError,
} from '@/lib/automations/retry'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

export const runtime = 'nodejs'
export const maxDuration = 10

type QueueRow = Tables<'automation_queue'>

type CronSummary = {
  recovered: number
  claimed: number
  succeeded: number
  rescheduled: number
  failed: number
  skipped: number
  duration_ms: number
}

function getJobContext(job: QueueRow, workerId: string) {
  return {
    job_id: job.id,
    event_key: job.event_key,
    worker_id: workerId,
    automation_id: job.automation_id,
    contact_id: job.contact_id,
    workspace_id: job.workspace_id,
    status: job.status,
    attempts: job.attempts,
    max_attempts: job.max_attempts,
  }
}

function addSeconds(date: Date, seconds: number): string {
  return new Date(date.getTime() + seconds * 1000).toISOString()
}

function classifyRetryable(result: AutomationActionResult): boolean {
  if (typeof result.retryable === 'boolean') return result.retryable
  if (result.skipped) return false

  const error = result.error ?? ''
  if (!error) return true

  return isLikelyRetryableError(error) || !result.skipped
}

function isAbandonedProcessingJob(job: QueueRow, now: Date, leaseSeconds: number): boolean {
  const leaseCutoffMs = now.getTime() - leaseSeconds * 1000

  if (job.locked_at) {
    return new Date(job.locked_at).getTime() < leaseCutoffMs
  }

  const conservativeSeconds = Math.max(leaseSeconds * 2, 3600)
  const conservativeCutoffMs = now.getTime() - conservativeSeconds * 1000
  const timestamps = [job.created_at, job.scheduled_for, job.last_attempt_at]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())

  return timestamps.length > 0 && timestamps.every((value) => value < conservativeCutoffMs)
}

async function insertAutomationLog(
  supabase: any,
  job: QueueRow,
  status: 'success' | 'failed' | 'skipped',
  errorMessage?: string | null
) {
  await supabase.from('automation_logs').insert({
    workspace_id: job.workspace_id,
    automation_id: job.automation_id,
    contact_id: job.contact_id,
    status,
    error_message: errorMessage ?? null,
  })
}

async function updateClaimedJob(
  supabase: any,
  job: QueueRow,
  workerId: string,
  values: Record<string, unknown>
): Promise<boolean> {
  const { data, error } = await supabase
    .from('automation_queue')
    .update(values)
    .eq('id', job.id)
    .eq('status', 'processing')
    .eq('locked_by', workerId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[cron] erro ao atualizar job adquirido.', {
      ...getJobContext(job, workerId),
      error: sanitizeAutomationError(error.message),
    })
    return false
  }

  return Boolean(data)
}

async function failPendingJob(
  supabase: any,
  job: QueueRow,
  message: string,
  nowIso: string
): Promise<boolean> {
  const sanitized = sanitizeAutomationError(message)
  const { data, error } = await supabase
    .from('automation_queue')
    .update({
      status: 'failed',
      processed_at: nowIso,
      locked_at: null,
      locked_by: null,
      error_message: sanitized,
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[cron] erro ao falhar job pending esgotado.', {
      job_id: job.id,
      event_key: job.event_key,
      error: sanitizeAutomationError(error.message),
    })
  }

  if (data) {
    await insertAutomationLog(supabase, job, 'failed', sanitized)
  }

  return Boolean(data)
}

async function recoverAbandonedJobs(
  supabase: any,
  workerId: string,
  now: Date,
  leaseSeconds: number
): Promise<{ recovered: number; failed: number }> {
  const { data, error } = await supabase
    .from('automation_queue')
    .select('*')
    .eq('status', 'processing')
    .order('scheduled_for', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[cron] erro ao buscar jobs abandonados.', {
      worker_id: workerId,
      error: sanitizeAutomationError(error.message),
    })
    return { recovered: 0, failed: 0 }
  }

  let recovered = 0
  let failed = 0
  const nowIso = now.toISOString()

  for (const job of (data ?? []) as QueueRow[]) {
    if (!isAbandonedProcessingJob(job, now, leaseSeconds)) continue

    const exhausted = job.attempts >= job.max_attempts
    const message = exhausted
      ? 'Lease expirado; max_attempts esgotado.'
      : 'Lease expirado; job recuperado para nova tentativa.'

    const { data: updated, error: updateError } = await supabase
      .from('automation_queue')
      .update({
        status: exhausted ? 'failed' : 'pending',
        scheduled_for: exhausted ? job.scheduled_for : nowIso,
        processed_at: exhausted ? nowIso : null,
        locked_at: null,
        locked_by: null,
        error_message: sanitizeAutomationError(message),
      })
      .eq('id', job.id)
      .eq('status', 'processing')
      .select('id')
      .maybeSingle()

    if (updateError) {
      console.error('[cron] erro ao recuperar job abandonado.', {
        ...getJobContext(job, workerId),
        error: sanitizeAutomationError(updateError.message),
      })
      continue
    }

    if (!updated) continue

    if (exhausted) {
      await insertAutomationLog(supabase, job, 'failed', sanitizeAutomationError(message))
      failed++
    } else {
      recovered++
    }

    console.info('[cron] job processing recuperado.', {
      ...getJobContext(job, workerId),
      recovered_status: exhausted ? 'failed' : 'pending',
    })
  }

  return { recovered, failed }
}

async function failExhaustedPendingJobs(
  supabase: any,
  workerId: string,
  nowIso: string
): Promise<number> {
  const { data, error } = await supabase
    .from('automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[cron] erro ao buscar jobs pending esgotados.', {
      worker_id: workerId,
      error: sanitizeAutomationError(error.message),
    })
    return 0
  }

  let failed = 0
  for (const job of ((data ?? []) as QueueRow[]).filter((row) => row.attempts >= row.max_attempts)) {
    const updated = await failPendingJob(
      supabase,
      job,
      'max_attempts esgotado antes de novo claim.',
      nowIso
    )
    if (updated) failed++
  }

  return failed
}

async function finalizeSuccess(
  supabase: any,
  job: QueueRow,
  automation: Automation,
  workerId: string,
  finishedAt: string
): Promise<boolean> {
  const updated = await updateClaimedJob(supabase, job, workerId, {
    status: 'done',
    processed_at: finishedAt,
    locked_at: null,
    locked_by: null,
    error_message: null,
  })

  if (!updated) return false

  await insertAutomationLog(supabase, job, 'success')
  await supabase
    .from('automations')
    .update({ run_count: (automation.run_count ?? 0) + 1, last_run_at: finishedAt })
    .eq('id', automation.id)

  return true
}

async function finalizeFailure(
  supabase: any,
  job: QueueRow,
  workerId: string,
  result: AutomationActionResult,
  finishedAt: Date
): Promise<'failed' | 'rescheduled' | 'skipped' | 'lost'> {
  const message = sanitizeAutomationError(result.error ?? 'Erro desconhecido')
  const retryable = classifyRetryable(result)
  const canRetry = retryable && job.attempts < job.max_attempts

  if (canRetry) {
    const delaySeconds = calculateRetryDelaySeconds(job.attempts)
    const nextScheduledFor = addSeconds(finishedAt, delaySeconds)
    const updated = await updateClaimedJob(supabase, job, workerId, {
      status: 'pending',
      scheduled_for: nextScheduledFor,
      processed_at: null,
      locked_at: null,
      locked_by: null,
      error_message: message,
    })

    if (!updated) return 'lost'

    await insertAutomationLog(supabase, job, 'failed', message)
    console.warn('[cron] job reagendado com backoff.', {
      ...getJobContext(job, workerId),
      retryable,
      next_scheduled_for: nextScheduledFor,
    })
    return 'rescheduled'
  }

  const logStatus = result.skipped ? 'skipped' : 'failed'
  const updated = await updateClaimedJob(supabase, job, workerId, {
    status: 'failed',
    processed_at: finishedAt.toISOString(),
    locked_at: null,
    locked_by: null,
    error_message: message,
  })

  if (!updated) return 'lost'

  await insertAutomationLog(supabase, job, logStatus, message)
  console.warn('[cron] job finalizado sem retry.', {
    ...getJobContext(job, workerId),
    retryable,
    final_status: logStatus,
  })

  return result.skipped ? 'skipped' : 'failed'
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const start = Date.now()
  const workerId = crypto.randomUUID()
  const supabase = createAdminClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const leaseSeconds = getAutomationJobLeaseSeconds()

  const summary: CronSummary = {
    recovered: 0,
    claimed: 0,
    succeeded: 0,
    rescheduled: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
  }

  const recovery = await recoverAbandonedJobs(supabase, workerId, now, leaseSeconds)
  summary.recovered += recovery.recovered
  summary.failed += recovery.failed
  summary.failed += await failExhaustedPendingJobs(supabase, workerId, nowIso)

  const { data: items, error } = await (supabase as any)
    .from('automation_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(10)

  if (error) {
    const message = sanitizeAutomationError(error.message)
    console.error('[cron] erro ao buscar fila.', { worker_id: workerId, error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const rows = (items ?? []) as QueueRow[]

  await Promise.allSettled(rows.map(async (item) => {
    if (item.attempts >= item.max_attempts) return

    const claimNow = new Date().toISOString()
    const { data: claimedJob, error: claimError } = await (supabase as any)
      .from('automation_queue')
      .update({
        status: 'processing',
        locked_at: claimNow,
        locked_by: workerId,
        last_attempt_at: claimNow,
        attempts: item.attempts + 1,
      })
      .eq('id', item.id)
      .eq('status', 'pending')
      .lte('scheduled_for', claimNow)
      .lt('attempts', item.max_attempts)
      .select('*')
      .maybeSingle()

    if (claimError) {
      console.error('[cron] erro ao adquirir job de automacao.', {
        ...getJobContext(item, workerId),
        error: sanitizeAutomationError(claimError.message),
      })
      return
    }

    if (!claimedJob) {
      console.info('[cron] job de automacao ja adquirido por outro worker.', getJobContext(item, workerId))
      return
    }

    const job = claimedJob as QueueRow
    summary.claimed++

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
      const message = sanitizeAutomationError(
        automationError?.message ?? contactError?.message ?? 'Erro ao buscar dados do job'
      )
      console.error('[cron] erro ao buscar dados de automacao ou contato.', {
        ...getJobContext(job, workerId),
        error: message,
      })
      const state = await finalizeFailure(
        supabase,
        job,
        workerId,
        { success: false, retryable: true, error: 'Erro ao buscar dados do job' },
        new Date()
      )
      if (state === 'rescheduled') summary.rescheduled++
      if (state === 'failed') summary.failed++
      if (state === 'skipped') summary.skipped++
      return
    }

    const automation = automationRow as Automation | null
    const contact = contactRow as Tables<'contacts'> | null

    if (!automation || !contact) {
      console.error('[cron] job de automacao sem relacao obrigatoria.', getJobContext(job, workerId))
      const state = await finalizeFailure(
        supabase,
        job,
        workerId,
        { success: false, retryable: false, error: 'Automacao ou contato nao encontrado' },
        new Date()
      )
      if (state === 'failed') summary.failed++
      if (state === 'skipped') summary.skipped++
      return
    }

    if (
      automation.workspace_id !== job.workspace_id ||
      contact.workspace_id !== job.workspace_id
    ) {
      console.error('[cron] isolamento de workspace violado em job de automacao.', {
        ...getJobContext(job, workerId),
        automation_workspace_id: automation.workspace_id,
        contact_workspace_id: contact.workspace_id,
      })
      const state = await finalizeFailure(
        supabase,
        job,
        workerId,
        { success: false, retryable: false, error: 'Automacao ou contato pertence a outro workspace' },
        new Date()
      )
      if (state === 'failed') summary.failed++
      if (state === 'skipped') summary.skipped++
      return
    }

    let result: AutomationActionResult
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
          result = { success: false, retryable: false, error: `Acao desconhecida: ${automation.action_type}` }
      }
    } catch (err) {
      result = { success: false, error: sanitizeAutomationError(err) }
    }

    const finishedAt = new Date()

    if (result.success) {
      const updated = await finalizeSuccess(
        supabase,
        job,
        automation,
        workerId,
        finishedAt.toISOString()
      )
      if (updated) summary.succeeded++
      return
    }

    const state = await finalizeFailure(supabase, job, workerId, result, finishedAt)
    if (state === 'rescheduled') summary.rescheduled++
    if (state === 'failed') summary.failed++
    if (state === 'skipped') summary.skipped++
  }))

  summary.duration_ms = Date.now() - start
  console.info('[cron] automation_queue processada.', {
    worker_id: workerId,
    ...summary,
  })

  return NextResponse.json(summary)
}
