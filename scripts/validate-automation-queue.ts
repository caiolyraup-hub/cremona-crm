import assert from 'node:assert/strict'
import {
  buildAutomationEventKey,
  buildAutomationQueueRows,
  type QueueableAutomation,
} from '../src/lib/automations/queue.ts'
import type { AutomationEvent } from '../src/lib/automations/engine.ts'

const workspaceId = 'workspace-1'
const contactId = 'contact-1'
const stageA = 'stage-a'
const stageB = 'stage-b'
const nowMs = Date.UTC(2026, 0, 1, 12, 0, 0)

function automation(
  overrides: Partial<QueueableAutomation>
): QueueableAutomation {
  return {
    id: overrides.id ?? 'automation-1',
    workspace_id: overrides.workspace_id ?? workspaceId,
    trigger_type: overrides.trigger_type ?? 'contact_created',
    trigger_config: overrides.trigger_config ?? {},
    active: overrides.active ?? true,
    delay_minutes: overrides.delay_minutes ?? 0,
  }
}

function scheduledDeltaMinutes(rowTime: string): number {
  return (new Date(rowTime).getTime() - nowMs) / 60_000
}

const contactCreated: AutomationEvent = {
  type: 'contact_created',
  workspaceId,
  contactId,
}

const immediateRows = buildAutomationQueueRows([
  automation({ id: 'immediate', delay_minutes: 0 }),
], contactCreated, nowMs)

assert.equal(immediateRows.length, 1, 'delay 0 should create one queue row')
assert.equal(immediateRows[0].status, 'pending')
assert.equal(scheduledDeltaMinutes(immediateRows[0].scheduled_for), 0)

const delayedRows = buildAutomationQueueRows([
  automation({ id: 'delayed', delay_minutes: 15 }),
], contactCreated, nowMs)

assert.equal(delayedRows.length, 1, 'delay 15 should create one queue row')
assert.equal(delayedRows[0].status, 'pending')
assert.equal(scheduledDeltaMinutes(delayedRows[0].scheduled_for), 15)

const noAutomationRows = buildAutomationQueueRows([
  automation({ id: 'inactive', active: false }),
  automation({ id: 'other-workspace', workspace_id: 'workspace-2' }),
], contactCreated, nowMs)

assert.equal(noAutomationRows.length, 0, 'no active matching automations should create no jobs')

const stageEnterRows = buildAutomationQueueRows([
  automation({ id: 'enter-a', trigger_type: 'stage_enter', trigger_config: { stage_id: stageA } }),
  automation({ id: 'enter-b', trigger_type: 'stage_enter', trigger_config: { stage_id: stageB } }),
  automation({ id: 'exit-a', trigger_type: 'stage_exit', trigger_config: { stage_id: stageA } }),
], {
  type: 'stage_enter',
  workspaceId,
  contactId,
  stageId: stageA,
}, nowMs)

assert.deepEqual(stageEnterRows.map((row) => row.automation_id), ['enter-a'])

const stageExitRows = buildAutomationQueueRows([
  automation({ id: 'exit-a', trigger_type: 'stage_exit', trigger_config: { stage_id: stageA } }),
  automation({ id: 'exit-b', trigger_type: 'stage_exit', trigger_config: { stage_id: stageB } }),
  automation({ id: 'enter-a', trigger_type: 'stage_enter', trigger_config: { stage_id: stageA } }),
], {
  type: 'stage_exit',
  workspaceId,
  contactId,
  stageId: stageA,
}, nowMs)

assert.deepEqual(stageExitRows.map((row) => row.automation_id), ['exit-a'])

const duplicateKeyA = buildAutomationEventKey(
  automation({ id: 'duplicate-contact' }),
  contactCreated
)
const duplicateKeyB = buildAutomationEventKey(
  automation({ id: 'duplicate-contact' }),
  contactCreated
)

assert.equal(duplicateKeyA, 'contact_created:contact-1:duplicate-contact')
assert.equal(duplicateKeyA, duplicateKeyB, 'same logical event should produce same event_key')
assert.equal(new Set([duplicateKeyA, duplicateKeyB]).size, 1)

const contactAKey = buildAutomationEventKey(
  automation({ id: 'contact-event' }),
  { type: 'contact_created', workspaceId, contactId: 'contact-a' }
)
const contactBKey = buildAutomationEventKey(
  automation({ id: 'contact-event' }),
  { type: 'contact_created', workspaceId, contactId: 'contact-b' }
)

assert.notEqual(contactAKey, contactBKey, 'different contacts should produce different event_keys')

const stageAKey = buildAutomationEventKey(
  automation({ id: 'stage-event', trigger_type: 'stage_enter', trigger_config: { stage_id: stageA } }),
  { type: 'stage_enter', workspaceId, contactId, stageId: stageA }
)
const stageBKey = buildAutomationEventKey(
  automation({ id: 'stage-event', trigger_type: 'stage_enter', trigger_config: { stage_id: stageB } }),
  { type: 'stage_enter', workspaceId, contactId, stageId: stageB }
)

assert.equal(stageAKey, 'stage_enter:contact-1:stage-a:stage-event')
assert.notEqual(stageAKey, stageBKey, 'different stages should produce different event_keys')

assert.equal(immediateRows[0].event_key, 'contact_created:contact-1:immediate')
assert.equal(delayedRows[0].event_key, 'contact_created:contact-1:delayed')

console.log('OK automation queue validation')
