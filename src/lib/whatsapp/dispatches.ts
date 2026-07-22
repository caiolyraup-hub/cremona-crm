/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeAutomationError } from '@/lib/automations/retry'
import type { SendWhatsAppResult, WhatsAppProviderName } from './providers'

export type DispatchOperation = 'text' | 'template' | 'media'

type DispatchRow = {
  id: string
  status: 'prepared' | 'sending' | 'accepted' | 'failed' | 'delivery_unknown'
  provider_message_id: string | null
  attempts: number
  last_error: string | null
}

export function buildRequestFingerprint(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function buildManualDispatchEventKey(params: {
  workspaceId: string
  contactId: string
  operation: DispatchOperation
}): string {
  return `inbox:${params.workspaceId}:${params.contactId}:${params.operation}:${crypto.randomUUID()}`
}

export async function sendWithDispatch(params: {
  workspaceId: string
  contactId: string | null
  automationQueueId?: string | null
  eventKey: string
  provider: WhatsAppProviderName
  operation: DispatchOperation
  requestFingerprint: string
  send: () => Promise<SendWhatsAppResult>
}): Promise<SendWhatsAppResult> {
  const supabase = createAdminClient()
  const lockId = crypto.randomUUID()

  const insertPayload = {
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    automation_queue_id: params.automationQueueId ?? null,
    event_key: params.eventKey,
    provider: params.provider,
    operation: params.operation,
    request_fingerprint: params.requestFingerprint,
    status: 'prepared',
  }

  const { data: inserted, error: insertError } = await (supabase as any)
    .from('whatsapp_dispatches')
    .insert(insertPayload)
    .select('id, status, provider_message_id, attempts, last_error')
    .maybeSingle()

  if (insertError && insertError.code !== '23505') {
    return {
      success: false,
      retryable: true,
      error: sanitizeAutomationError(insertError.message),
    }
  }

  let dispatch = inserted as DispatchRow | null
  if (!dispatch) {
    const { data, error } = await (supabase as any)
      .from('whatsapp_dispatches')
      .select('id, status, provider_message_id, attempts, last_error')
      .eq('provider', params.provider)
      .eq('event_key', params.eventKey)
      .maybeSingle()

    if (error || !data) {
      return {
        success: false,
        retryable: true,
        error: sanitizeAutomationError(error?.message ?? 'Dispatch nao encontrado.'),
      }
    }
    dispatch = data as DispatchRow
  }

  if (dispatch.status === 'accepted') {
    return {
      success: true,
      skipped: true,
      messageId: dispatch.provider_message_id ?? undefined,
      providerStatus: 'accepted',
    }
  }

  if (dispatch.status === 'delivery_unknown') {
    return {
      success: false,
      retryable: false,
      deliveryUnknown: true,
      error:
        dispatch.last_error ??
        'Envio anterior ficou com aceite incerto no provedor. Revisao manual necessaria.',
    }
  }

  if (dispatch.status === 'sending') {
    return {
      success: false,
      retryable: true,
      error: 'Dispatch ja esta em envio por outro worker.',
    }
  }

  const { data: claimed, error: claimError } = await (supabase as any)
    .from('whatsapp_dispatches')
    .update({
      status: 'sending',
      locked_by: lockId,
      locked_at: new Date().toISOString(),
      attempts: dispatch.attempts + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dispatch.id)
    .in('status', ['prepared', 'failed'])
    .select('id')
    .maybeSingle()

  if (claimError) {
    return {
      success: false,
      retryable: true,
      error: sanitizeAutomationError(claimError.message),
    }
  }

  if (!claimed) {
    return {
      success: false,
      retryable: true,
      error: 'Dispatch nao adquirido para envio.',
    }
  }

  const result = await params.send()
  const sanitizedError = sanitizeAutomationError(result.error ?? 'Erro ao enviar WhatsApp.')
  const now = new Date().toISOString()

  if (result.success) {
    await (supabase as any)
      .from('whatsapp_dispatches')
      .update({
        status: 'accepted',
        provider_message_id: result.messageId ?? null,
        last_error: null,
        accepted_at: now,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', dispatch.id)
      .eq('locked_by', lockId)

    return result
  }

  if (result.deliveryUnknown) {
    await (supabase as any)
      .from('whatsapp_dispatches')
      .update({
        status: 'delivery_unknown',
        last_error: sanitizedError,
        delivery_unknown_at: now,
        locked_at: null,
        locked_by: null,
        updated_at: now,
      })
      .eq('id', dispatch.id)
      .eq('locked_by', lockId)

    return { ...result, retryable: false, error: sanitizedError }
  }

  await (supabase as any)
    .from('whatsapp_dispatches')
    .update({
      status: 'failed',
      last_error: sanitizedError,
      locked_at: null,
      locked_by: null,
      updated_at: now,
    })
    .eq('id', dispatch.id)
    .eq('locked_by', lockId)

  return { ...result, error: sanitizedError }
}
