import type { Automation } from '../../types/app'
import type { Insert } from '../../types/database'
import type { AutomationEvent } from './engine'

export type QueueableAutomation = Pick<
  Automation,
  'id' | 'workspace_id' | 'trigger_type' | 'trigger_config' | 'active' | 'delay_minutes'
>

export type AutomationQueueInsert = Insert<'automation_queue'>

export function automationMatchesEvent(
  automation: QueueableAutomation,
  event: AutomationEvent
): boolean {
  if (!automation.active) return false
  if (automation.workspace_id !== event.workspaceId) return false
  if (automation.trigger_type !== event.type) return false

  if (event.type === 'stage_enter' || event.type === 'stage_exit') {
    return automation.trigger_config?.stage_id === event.stageId
  }

  return true
}

export function buildAutomationQueueRows(
  automations: QueueableAutomation[],
  event: AutomationEvent,
  nowMs = Date.now()
): AutomationQueueInsert[] {
  return automations
    .filter((automation) => automationMatchesEvent(automation, event))
    .map((automation) => {
      const scheduledFor = new Date(
        nowMs + automation.delay_minutes * 60_000
      )

      return {
        workspace_id: event.workspaceId,
        automation_id: automation.id,
        contact_id: event.contactId,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      }
    })
}
