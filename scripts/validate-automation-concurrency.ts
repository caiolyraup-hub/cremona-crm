import assert from 'node:assert/strict'

type SimulatedJob = {
  id: string
  workspace_id: string
  automation_id: string
  contact_id: string
  event_key: string
  scheduled_for: string
  status: 'pending' | 'processing' | 'done' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
}

type SimulatedRelation = {
  workspace_id: string
}

const now = new Date('2026-01-01T12:00:00.000Z')

function createJob(overrides: Partial<SimulatedJob> = {}): SimulatedJob {
  return {
    id: overrides.id ?? 'job-1',
    workspace_id: overrides.workspace_id ?? 'workspace-1',
    automation_id: overrides.automation_id ?? 'automation-1',
    contact_id: overrides.contact_id ?? 'contact-1',
    event_key: overrides.event_key ?? 'contact_created:contact-1:automation-1',
    scheduled_for: overrides.scheduled_for ?? now.toISOString(),
    status: overrides.status ?? 'pending',
    attempts: overrides.attempts ?? 0,
    max_attempts: overrides.max_attempts ?? 3,
  }
}

async function claimJob(job: SimulatedJob): Promise<SimulatedJob | null> {
  if (job.status !== 'pending') return null
  if (new Date(job.scheduled_for).getTime() > now.getTime()) return null

  job.status = 'processing'
  job.attempts += 1
  return { ...job }
}

function workspacesAreConsistent(
  job: SimulatedJob,
  automation: SimulatedRelation,
  contact: SimulatedRelation
): boolean {
  return (
    automation.workspace_id === job.workspace_id &&
    contact.workspace_id === job.workspace_id
  )
}

async function processAfterClaim(
  claimedJob: SimulatedJob | null,
  automation: SimulatedRelation,
  contact: SimulatedRelation,
  execute: () => void
): Promise<'not_claimed' | 'failed' | 'executed'> {
  if (!claimedJob) return 'not_claimed'

  if (!workspacesAreConsistent(claimedJob, automation, contact)) {
    claimedJob.status = 'failed'
    return 'failed'
  }

  execute()
  claimedJob.status = 'done'
  return 'executed'
}

const concurrentJob = createJob()
const [claimA, claimB] = await Promise.all([claimJob(concurrentJob), claimJob(concurrentJob)])

assert.equal(
  [claimA, claimB].filter(Boolean).length,
  1,
  'only one concurrent claim should acquire the job'
)
assert.equal(concurrentJob.status, 'processing')
assert.equal(concurrentJob.attempts, 1)

let executions = 0
const alreadyProcessing = createJob({ status: 'processing' })
const skippedClaim = await claimJob(alreadyProcessing)
const skippedResult = await processAfterClaim(
  skippedClaim,
  { workspace_id: 'workspace-1' },
  { workspace_id: 'workspace-1' },
  () => { executions += 1 }
)

assert.equal(skippedResult, 'not_claimed')
assert.equal(executions, 0, 'no action should run without a confirmed claim')

const mismatchedJob = createJob()
const mismatchClaim = await claimJob(mismatchedJob)
const mismatchResult = await processAfterClaim(
  mismatchClaim,
  { workspace_id: 'workspace-2' },
  { workspace_id: 'workspace-1' },
  () => { executions += 1 }
)

assert.equal(mismatchResult, 'failed')
assert.equal(executions, 0, 'workspace mismatch should not execute external action')

console.log('OK automation concurrency validation')
