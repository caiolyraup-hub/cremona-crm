/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAutomationQueueRows } from './queue'
import type { Automation } from '@/types/app'

export type AutomationEvent =
  | { type: 'stage_enter' | 'stage_exit'; workspaceId: string; contactId: string; stageId: string }
  | { type: 'contact_created'; workspaceId: string; contactId: string }

export class AutomationEnqueueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AutomationEnqueueError'
  }
}

export type AutomationEnqueueResult = {
  enqueued: number
  duplicates: number
}

function getEventContext(event: AutomationEvent) {
  return {
    event_type: event.type,
    workspace_id: event.workspaceId,
    contact_id: event.contactId,
    stage_id: 'stageId' in event ? event.stageId : null,
  }
}

function isDuplicateEventKeyError(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? ''

  return (
    error.code === '23505' &&
    (
      message.includes('automation_queue_event_key_unique') ||
      message.includes('event_key')
    )
  )
}

export async function runAutomationsForEvent(event: AutomationEvent): Promise<AutomationEnqueueResult> {
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
    console.error('[automations] erro ao buscar automacoes para enfileirar.', {
      ...getEventContext(event),
      error: error.message,
    })
    throw new AutomationEnqueueError('Nao foi possivel buscar automacoes ativas para o evento.')
  }

  const automations = (rows ?? []) as Automation[]
  const queueRows = buildAutomationQueueRows(automations, event)

  if (queueRows.length === 0) {
    return { enqueued: 0, duplicates: 0 }
  }

  let enqueued = 0
  let duplicates = 0

  for (const queueRow of queueRows) {
    const { error: insertError } = await (supabase as any)
      .from('automation_queue')
      .insert(queueRow)

    if (!insertError) {
      enqueued++
      continue
    }

    if (isDuplicateEventKeyError(insertError)) {
      duplicates++
      console.info('[automations] job duplicado ignorado.', {
        ...getEventContext(event),
        event_key: queueRow.event_key,
        automation_id: queueRow.automation_id,
        contact_id: queueRow.contact_id,
        workspace_id: queueRow.workspace_id,
        status: queueRow.status,
      })
      continue
    }

    console.error('[automations] erro ao inserir job na fila.', {
      ...getEventContext(event),
      event_key: queueRow.event_key,
      automation_id: queueRow.automation_id,
      error: insertError.message,
    })
    throw new AutomationEnqueueError('Nao foi possivel registrar automacoes na fila.')
  }

  return { enqueued, duplicates }
}
