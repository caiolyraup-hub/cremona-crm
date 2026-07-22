import assert from 'node:assert/strict'
import { calculateRetryDelaySeconds } from '../src/lib/automations/retry.ts'

process.env.AUTOMATION_RETRY_BASE_SECONDS = '60'
process.env.AUTOMATION_RETRY_MAX_SECONDS = '1800'

type SimulatedStatus = 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'

type SimulatedJob = {
  id: string
  workspace_id: string
  automation_id: string
  contact_id: string
  event_key: string
  scheduled_for: string
  status: SimulatedStatus
  attempts: number
  max_attempts: number
  created_at: string
  processed_at: string | null
  locked_at: string | null
  locked_by: string | null
  last_attempt_at: string | null
  error_message: string | null
}

type ActionResult = {
  success: boolean
  skipped?: boolean
  retryable?: boolean
  error?: string
}

type SimulatedLog = {
  job_id: string
  status: 'success' | 'failed' | 'skipped'
}

const baseNow = new Date('2026-01-01T12:00:00.000Z')

function createJob(overrides: Partial<SimulatedJob> = {}): SimulatedJob {
  return {
    id: overrides.id ?? 'job-1',
    workspace_id: overrides.workspace_id ?? 'workspace-1',
    automation_id: overrides.automation_id ?? 'automation-1',
    contact_id: overrides.contact_id ?? 'contact-1',
    event_key: overrides.event_key ?? 'contact_created:contact-1:automation-1',
    scheduled_for: overrides.scheduled_for ?? baseNow.toISOString(),
    status: overrides.status ?? 'pending',
    attempts: overrides.attempts ?? 0,
    max_attempts: overrides.max_attempts ?? 3,
    created_at: overrides.created_at ?? baseNow.toISOString(),
    processed_at: overrides.processed_at ?? null,
    locked_at: overrides.locked_at ?? null,
    locked_by: overrides.locked_by ?? null,
    last_attempt_at: overrides.last_attempt_at ?? null,
    error_message: overrides.error_message ?? null,
  }
}

function addSeconds(date: Date, seconds: number): string {
  return new Date(date.getTime() + seconds * 1000).toISOString()
}

function claimJob(job: SimulatedJob, workerId: string, now: Date): SimulatedJob | null {
  if (job.status !== 'pending') return null
  if (new Date(job.scheduled_for).getTime() > now.getTime()) return null
  if (job.attempts >= job.max_attempts) return null

  job.status = 'processing'
  job.attempts += 1
  job.locked_at = now.toISOString()
  job.locked_by = workerId
  job.last_attempt_at = now.toISOString()
  return { ...job }
}

function finalizeSuccess(
  job: SimulatedJob,
  workerId: string,
  now: Date,
  logs: SimulatedLog[]
): boolean {
  if (job.status !== 'processing' || job.locked_by !== workerId) return false

  job.status = 'done'
  job.processed_at = now.toISOString()
  job.locked_at = null
  job.locked_by = null
  job.error_message = null
  logs.push({ job_id: job.id, status: 'success' })
  return true
}

function finalizeFailure(
  job: SimulatedJob,
  workerId: string,
  result: ActionResult,
  now: Date,
  logs: SimulatedLog[]
): 'failed' | 'rescheduled' | 'skipped' | 'lost' {
  if (job.status !== 'processing' || job.locked_by !== workerId) return 'lost'

  const retryable = result.retryable ?? !result.skipped
  const canRetry = retryable && job.attempts < job.max_attempts
  job.error_message = result.error ?? 'Erro desconhecido'
  job.locked_at = null
  job.locked_by = null

  if (canRetry) {
    job.status = 'pending'
    job.processed_at = null
    job.scheduled_for = addSeconds(now, calculateRetryDelaySeconds(job.attempts))
    logs.push({ job_id: job.id, status: 'failed' })
    return 'rescheduled'
  }

  job.status = 'failed'
  job.processed_at = now.toISOString()
  logs.push({ job_id: job.id, status: result.skipped ? 'skipped' : 'failed' })
  return result.skipped ? 'skipped' : 'failed'
}

function isAbandonedProcessingJob(job: SimulatedJob, now: Date, leaseSeconds: number): boolean {
  const leaseCutoffMs = now.getTime() - leaseSeconds * 1000
  if (job.locked_at) return new Date(job.locked_at).getTime() < leaseCutoffMs

  const conservativeCutoffMs = now.getTime() - Math.max(leaseSeconds * 2, 3600) * 1000
  return [job.created_at, job.scheduled_for]
    .map((value) => new Date(value).getTime())
    .every((value) => value < conservativeCutoffMs)
}

function recoverJob(job: SimulatedJob, now: Date, leaseSeconds: number): 'recovered' | 'failed' | 'active' {
  if (job.status !== 'processing') return 'active'
  if (!isAbandonedProcessingJob(job, now, leaseSeconds)) return 'active'

  job.locked_at = null
  job.locked_by = null

  if (job.attempts >= job.max_attempts) {
    job.status = 'failed'
    job.processed_at = now.toISOString()
    job.error_message = 'Lease expirado; max_attempts esgotado.'
    return 'failed'
  }

  job.status = 'pending'
  job.scheduled_for = now.toISOString()
  job.processed_at = null
  job.error_message = 'Lease expirado; job recuperado para nova tentativa.'
  return 'recovered'
}

function scheduledDeltaSeconds(job: SimulatedJob, now: Date): number {
  return Math.round((new Date(job.scheduled_for).getTime() - now.getTime()) / 1000)
}

// Teste 1 - sucesso
{
  const logs: SimulatedLog[] = []
  const job = createJob()
  const claimed = claimJob(job, 'worker-a', baseNow)
  assert.ok(claimed)
  assert.equal(job.status, 'processing')
  assert.equal(job.attempts, 1)
  assert.equal(finalizeSuccess(job, 'worker-a', baseNow, logs), true)
  assert.equal(job.status, 'done')
  assert.ok(job.processed_at)
  assert.equal(job.locked_at, null)
  assert.equal(job.locked_by, null)
  assert.equal(logs.filter((log) => log.status === 'success').length, 1)
}

// Teste 2 - primeira falha transitoria
{
  const logs: SimulatedLog[] = []
  const job = createJob()
  assert.ok(claimJob(job, 'worker-a', baseNow))
  const state = finalizeFailure(job, 'worker-a', {
    success: false,
    retryable: true,
    error: 'HTTP 503',
  }, baseNow, logs)
  assert.equal(state, 'rescheduled')
  assert.equal(job.attempts, 1)
  assert.equal(job.status, 'pending')
  assert.equal(scheduledDeltaSeconds(job, baseNow), 60)
  assert.equal(job.locked_at, null)
  assert.equal(job.locked_by, null)
}

// Teste 3 - exponential backoff
{
  assert.equal(calculateRetryDelaySeconds(1), 60)
  assert.equal(calculateRetryDelaySeconds(2), 120)
  assert.equal(calculateRetryDelaySeconds(3), 240)
  assert.equal(calculateRetryDelaySeconds(20), 1800)
}

// Teste 4 - erro permanente
{
  const logs: SimulatedLog[] = []
  const job = createJob()
  assert.ok(claimJob(job, 'worker-a', baseNow))
  const state = finalizeFailure(job, 'worker-a', {
    success: false,
    retryable: false,
    error: 'Telefone invalido',
  }, baseNow, logs)
  assert.equal(state, 'failed')
  assert.equal(job.status, 'failed')
  assert.ok(job.processed_at)
}

// Teste 5 - max_attempts sem limite hardcoded de 3
{
  const logs: SimulatedLog[] = []
  const job = createJob({ max_attempts: 5 })
  let now = baseNow

  for (let attempt = 1; attempt <= 5; attempt++) {
    assert.ok(claimJob(job, 'worker-a', now), `attempt ${attempt} should be claimable`)
    const state = finalizeFailure(job, 'worker-a', {
      success: false,
      retryable: true,
      error: 'timeout',
    }, now, logs)

    if (attempt < 5) {
      assert.equal(state, 'rescheduled')
      now = new Date(job.scheduled_for)
    } else {
      assert.equal(state, 'failed')
    }
  }

  assert.equal(job.attempts, 5)
  assert.equal(job.status, 'failed')
}

// Teste 6 - job abandonado
{
  const job = createJob({
    status: 'processing',
    attempts: 1,
    locked_at: addSeconds(baseNow, -600),
    locked_by: 'old-worker',
  })
  assert.equal(recoverJob(job, baseNow, 300), 'recovered')
  assert.equal(job.status, 'pending')
  assert.equal(job.scheduled_for, baseNow.toISOString())
  assert.equal(job.locked_at, null)
  assert.equal(job.locked_by, null)
  assert.ok(claimJob(job, 'worker-a', baseNow))
}

// Teste 7 - job ativo
{
  const job = createJob({
    status: 'processing',
    locked_at: addSeconds(baseNow, -60),
    locked_by: 'active-worker',
  })
  assert.equal(recoverJob(job, baseNow, 300), 'active')
  assert.equal(job.status, 'processing')
  assert.equal(job.locked_by, 'active-worker')
}

// Teste 8 - job abandonado sem tentativas restantes
{
  const job = createJob({
    status: 'processing',
    attempts: 3,
    max_attempts: 3,
    locked_at: addSeconds(baseNow, -600),
    locked_by: 'old-worker',
  })
  assert.equal(recoverJob(job, baseNow, 300), 'failed')
  assert.equal(job.status, 'failed')
  assert.ok(job.processed_at)
}

// Teste 9 - protecao por locked_by
{
  const logs: SimulatedLog[] = []
  const job = createJob()
  assert.ok(claimJob(job, 'worker-a', baseNow))
  assert.equal(finalizeSuccess(job, 'worker-b', baseNow, logs), false)
  assert.equal(job.status, 'processing')
  assert.equal(finalizeSuccess(job, 'worker-a', baseNow, logs), true)
  assert.equal(job.status, 'done')
}

// Teste 10 - idempotencia preservada
{
  const jobsByEventKey = new Map<string, SimulatedJob>()
  const original = createJob()
  jobsByEventKey.set(original.event_key, original)

  const duplicate = createJob({ id: 'job-duplicate' })
  if (!jobsByEventKey.has(duplicate.event_key)) {
    jobsByEventKey.set(duplicate.event_key, duplicate)
  }

  assert.equal(jobsByEventKey.size, 1)
  const job = jobsByEventKey.get(original.event_key)!
  const logs: SimulatedLog[] = []
  assert.ok(claimJob(job, 'worker-a', baseNow))
  assert.equal(finalizeFailure(job, 'worker-a', {
    success: false,
    retryable: true,
    error: 'HTTP 429',
  }, baseNow, logs), 'rescheduled')
  assert.equal(jobsByEventKey.get(original.event_key)!.id, original.id)
  assert.equal(jobsByEventKey.size, 1)
}

console.log('OK automation concurrency and retry validation')
