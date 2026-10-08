/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getWhatsAppProviderForWorkspace } from '@/lib/whatsapp/providers'
import { normalizeWhatsAppPhone } from '@/lib/whatsapp/format'
import { buildRequestFingerprint, sendWithDispatch } from '@/lib/whatsapp/dispatches'
import { persistWhatsAppMessage } from '@/lib/whatsapp/messages'
import { sanitizeAutomationError } from '@/lib/automations/retry'
import { getLuccaConfig } from './config'
import { formatArrivalTime, getGreeting, isWithinLuccaWindow } from './time'
import {
  asksForHuman,
  asksToStop,
  buildFallbackReply,
  buildInitialFallbackReply,
  resolveConfirmedTreatment,
  sanitizeFirstName,
  isDirectAiQuestion,
  stripEmojis,
} from './messages'
import { interpretWithOpenAI, validateLuccaReply } from './openai'
import {
  buildQualificationSummary,
  deterministicExtraction,
  getNextQualificationAction,
  getStepForAction,
  mergeQualificationState,
  type LuccaInterpretation,
  type LuccaNextAction,
  type QualificationState,
} from './state'

type Job = {
  id: string
  workspace_id: string
  contact_id: string
  qualification_id: string
  message_id: string | null
  job_type: 'conversation' | 'notification'
  event_key: string
  status: string
  attempts: number
  max_attempts: number
  locked_at: string | null
  output: Record<string, any> | null
  created_at: string
}

type WorkerSummary = {
  enabled: boolean
  recovered: number
  paused: number
  claimed: number
  succeeded: number
  rescheduled: number
  failed: number
  skipped: number
  duration_ms: number
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1_000).toISOString()
}

function retryDelay(attempt: number, base: number) {
  return Math.min(base * 2 ** Math.max(0, attempt - 1), 900)
}

async function pauseOutsideWindow(supabase: any, now: Date) {
  const config = getLuccaConfig()
  if (isWithinLuccaWindow(now, config)) return 0

  const nowIso = now.toISOString()
  const { data } = await supabase
    .from('lucca_qualifications')
    .update({
      status: 'awaiting_human',
      paused_at: nowIso,
      pause_reason: 'operating_window_closed',
    })
    .eq('workspace_id', config.workspaceId)
    .eq('status', 'active')
    .select('id')
  const ids = (data ?? []).map((row: { id: string }) => row.id)
  if (ids.length > 0) {
    await supabase
      .from('lucca_jobs')
      .update({ status: 'cancelled', processed_at: nowIso, last_error: 'Janela do Lucca encerrada.' })
      .in('qualification_id', ids)
      .eq('status', 'pending')
  }
  return ids.length
}

async function recoverExpiredJobs(supabase: any, now: Date) {
  const config = getLuccaConfig()
  const cutoff = new Date(now.getTime() - config.jobLeaseSeconds * 1_000).toISOString()
  const { data: rows } = await supabase
    .from('lucca_jobs')
    .select('id, attempts, max_attempts')
    .eq('status', 'processing')
    .lt('locked_at', cutoff)

  let recovered = 0
  for (const row of rows ?? []) {
    const exhausted = row.attempts >= row.max_attempts
    const { data } = await supabase
      .from('lucca_jobs')
      .update({
        status: exhausted ? 'failed' : 'pending',
        scheduled_for: exhausted ? undefined : now.toISOString(),
        locked_at: null,
        locked_by: null,
        processed_at: exhausted ? now.toISOString() : null,
        last_error: 'Lease expirado; trabalho recuperado.',
      })
      .eq('id', row.id)
      .eq('status', 'processing')
      .lt('locked_at', cutoff)
      .select('id')
      .maybeSingle()
    if (data?.id) recovered++
  }
  return recovered
}

async function claimJob(supabase: any, job: Job, workerId: string) {
  const nowIso = new Date().toISOString()
  const { data, error } = await supabase
    .from('lucca_jobs')
    .update({
      status: 'processing',
      attempts: job.attempts + 1,
      locked_at: nowIso,
      locked_by: workerId,
      last_attempt_at: nowIso,
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .lt('attempts', job.max_attempts)
    .select('*')
    .maybeSingle()
  if (error?.code === '23505') return null
  if (error) throw error
  return data as Job | null
}

async function finishJob(supabase: any, job: Job, workerId: string) {
  const { data } = await supabase
    .from('lucca_jobs')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', job.id)
    .eq('status', 'processing')
    .eq('locked_by', workerId)
    .select('id')
    .maybeSingle()
  return Boolean(data?.id)
}

async function failJob(supabase: any, job: Job, workerId: string, error: unknown, retryable: boolean) {
  const message = sanitizeAutomationError(error)
  const config = getLuccaConfig()
  const canRetry = retryable && job.attempts < job.max_attempts
  const values = canRetry
    ? {
        status: 'pending',
        scheduled_for: addSeconds(new Date(), retryDelay(job.attempts, config.retryBaseSeconds)),
        locked_at: null,
        locked_by: null,
        last_error: message,
      }
    : {
        status: 'failed',
        processed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: message,
      }
  const { data } = await supabase
    .from('lucca_jobs')
    .update(values)
    .eq('id', job.id)
    .eq('status', 'processing')
    .eq('locked_by', workerId)
    .select('id')
    .maybeSingle()
  return data?.id ? (canRetry ? 'rescheduled' : 'failed') : 'lost'
}

function describeOrigin(qualification: any) {
  if (qualification.origin_evidence === 'twilio_referral') {
    const referral = qualification.origin?.referral ?? {}
    return [referral.headline, referral.source_id ? `anúncio ${referral.source_id}` : null]
      .filter(Boolean)
      .join(' — ') || 'Anúncio Click to WhatsApp'
  }
  if (qualification.origin_evidence === 'lead_submission') {
    const origin = qualification.origin ?? {}
    return [origin.utm_source, origin.utm_campaign, origin.utm_content].filter(Boolean).join(' / ')
      || origin.source
      || 'Cadastro/formulário vinculado'
  }
  return 'Origem não identificada'
}

async function processNotification(supabase: any, job: Job) {
  const config = getLuccaConfig()
  const [{ data: qualification }, { data: contact }] = await Promise.all([
    supabase.from('lucca_qualifications').select('*').eq('id', job.qualification_id).maybeSingle(),
    supabase
      .from('contacts')
      .select('id, workspace_id, name, phone')
      .eq('workspace_id', job.workspace_id)
      .eq('id', job.contact_id)
      .maybeSingle(),
  ])
  if (
    !qualification ||
    !contact ||
    qualification.workspace_id !== job.workspace_id ||
    contact.workspace_id !== job.workspace_id ||
    contact.id !== job.contact_id
  ) {
    return { success: false, retryable: false, error: 'Estado da notificação não encontrado.' }
  }
  if (qualification.notification_status !== 'pending') return { success: true, skipped: true }
  if (!config.notificationContentSid) {
    await supabase.from('lucca_qualifications').update({
      notification_status: 'failed',
      notification_error: 'LUCCA_NOTIFICATION_CONTENT_SID não configurado.',
    }).eq('id', qualification.id)
    return { success: false, retryable: false, error: 'LUCCA_NOTIFICATION_CONTENT_SID não configurado.' }
  }

  const resolved = await getWhatsAppProviderForWorkspace(job.workspace_id)
  if (!resolved.provider || resolved.provider.name !== 'twilio') {
    return { success: false, retryable: true, error: resolved.error?.error ?? 'Provedor Twilio indisponível.' }
  }
  const link = config.appUrl
    ? `${config.appUrl}/dashboard/inbox?contact=${encodeURIComponent(job.contact_id)}`
    : '/dashboard/inbox'
  const variables = {
    '1': stripEmojis(sanitizeFirstName(contact.name) ?? 'Nome não informado'),
    '2': stripEmojis(contact.phone ?? 'Telefone não informado'),
    '3': formatArrivalTime(new Date(qualification.initial_received_at), config.timeZone),
    '4': stripEmojis(String(qualification.first_message_text ?? 'Mensagem sem texto')).slice(0, 500),
    '5': stripEmojis(describeOrigin(qualification)).slice(0, 500),
    '6': link,
  }
  const result = await sendWithDispatch({
    workspaceId: job.workspace_id,
    contactId: job.contact_id,
    eventKey: job.event_key,
    provider: 'twilio',
    operation: 'template',
    requestFingerprint: buildRequestFingerprint({
      to: config.notificationTo,
      contentSid: config.notificationContentSid,
      variables,
    }),
    send: () => resolved.provider!.sendTemplate({
      to: config.notificationTo,
      contentSid: config.notificationContentSid,
      contentVariables: variables,
    }),
  })
  if (!result.success) {
    await supabase.from('lucca_qualifications').update({
      notification_status:
        result.retryable !== false && !result.deliveryUnknown ? 'pending' : 'failed',
      notification_error: result.error?.slice(0, 500) ?? 'Falha no aviso ao Caio.',
    }).eq('id', qualification.id)
    return result
  }
  await supabase.from('lucca_qualifications').update({
    notification_status: 'accepted',
    notification_message_sid: result.messageId ?? null,
    notification_error: null,
    notified_at: new Date().toISOString(),
  }).eq('id', qualification.id)
  return result
}

function fallbackInterpretation(params: {
  text: string
  current: QualificationState
  isFirst: boolean
  date: Date
  timeZone: string
  firstName: string | null
  treatment: 'male' | 'female' | 'neutral'
}): { interpretation: LuccaInterpretation; merged: QualificationState; action: LuccaNextAction } {
  const extracted = deterministicExtraction(params.text)
  const merged = { ...params.current, ...Object.fromEntries(Object.entries(extracted).filter(([, value]) => value !== null)) } as QualificationState
  let action: LuccaNextAction = getNextQualificationAction(merged)
  if (asksToStop(params.text)) action = 'stop'
  else if (asksForHuman(params.text)) action = 'handoff'
  let reply = params.isFirst
    ? buildInitialFallbackReply({
        date: params.date,
        timeZone: params.timeZone,
        firstName: params.firstName,
        treatment: params.treatment,
        nextAction: action,
        businessType: merged.business_type,
      })
    : buildFallbackReply({ nextField: action, firstName: params.firstName, businessType: merged.business_type })
  if (isDirectAiQuestion(params.text)) {
    reply = params.isFirst
      ? `${reply} E, respondendo à sua pergunta: sou um assistente virtual da QCM.`
      : `Sou um assistente virtual da QCM. ${reply}`
  }
  const empty = { answered: false, refused: false, value: null, numericValue: null }
  return {
    interpretation: {
      reply,
      intendedNextAction: action,
      city: empty,
      digitalExperience: empty,
      teamSize: empty,
      businessType: merged.business_type,
      asksIfAi: isDirectAiQuestion(params.text),
      requestsHuman: action === 'handoff',
      requestsStop: action === 'stop',
      questionForCaio: null,
    },
    merged,
    action,
  }
}

async function processConversation(supabase: any, job: Job) {
  const config = getLuccaConfig()
  const [{ data: qualification }, { data: contact }] = await Promise.all([
    supabase.from('lucca_qualifications').select('*').eq('id', job.qualification_id).maybeSingle(),
    supabase.from('contacts').select('id, workspace_id, name, phone, custom_fields').eq('id', job.contact_id).maybeSingle(),
  ])
  if (!qualification || !contact || qualification.workspace_id !== job.workspace_id || contact.workspace_id !== job.workspace_id) {
    return { success: false, retryable: false, error: 'Qualificação ou contato inválido.' }
  }
  if (qualification.status !== 'active') return { success: true, skipped: true }
  if (!isWithinLuccaWindow(new Date(), config)) {
    await supabase.from('lucca_qualifications').update({
      status: 'awaiting_human', paused_at: new Date().toISOString(), pause_reason: 'operating_window_closed',
    }).eq('id', qualification.id).eq('status', 'active')
    return { success: true, skipped: true }
  }

  const cached = job.output?.reply ? job.output : null
  const { data: pendingJobs } = await supabase
    .from('lucca_jobs')
    .select('id, message_id, created_at')
    .eq('qualification_id', qualification.id)
    .eq('job_type', 'conversation')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)
  const pendingForBatch = cached ? [] : (pendingJobs ?? [])
  const cachedMessageIds = Array.isArray(cached?.message_ids) ? cached.message_ids : []
  const messageIds = (cachedMessageIds.length > 0
    ? cachedMessageIds
    : [job.message_id, ...pendingForBatch.map((row: any) => row.message_id)]
  ).filter(Boolean)
  const { data: messages } = await supabase
    .from('messages')
    .select('id, whatsapp_message_id, content, media_type, created_at')
    .eq('workspace_id', job.workspace_id)
    .eq('contact_id', job.contact_id)
    .in('id', messageIds)
    .order('created_at', { ascending: true })
  if (!messages?.length) return { success: false, retryable: true, error: 'Mensagem inbound não encontrada.' }
  if (qualification.last_processed_message_id === messages[messages.length - 1].id) {
    return { success: true, skipped: true }
  }

  const text = messages
    .map((message: any) => message.content?.trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, config.maxInputCharacters)
  const hasUnsupportedMedia = messages.some((message: any) => message.media_type !== 'text')
  const { data: recentConversationRows, error: recentConversationError } = await supabase
    .from('messages')
    .select('direction, content, sender_type, created_at')
    .eq('workspace_id', job.workspace_id)
    .eq('contact_id', job.contact_id)
    .lt('created_at', messages[0].created_at)
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(8)
  if (recentConversationError) {
    return {
      success: false,
      retryable: true,
      error: `Falha ao carregar contexto recente: ${recentConversationError.message}`,
    }
  }
  const recentConversation = (recentConversationRows ?? [])
    .slice()
    .reverse()
    .map((message: any) => ({
      direction: message.direction === 'inbound' ? 'inbound' as const : 'outbound' as const,
      senderType: String(message.sender_type ?? 'unknown'),
      text: String(message.content ?? '').trim(),
    }))
    .filter((message: { text: string }) => message.text.length > 0)
  const current: QualificationState = {
    city: qualification.city,
    digital_experience: qualification.digital_experience,
    team_size_text: qualification.team_size_text,
    team_size_number: qualification.team_size_number,
    business_type: qualification.business_type,
  }
  const firstName = sanitizeFirstName(contact.name)
  const treatment = resolveConfirmedTreatment(contact.custom_fields)
  const isFirst = !qualification.reception_sent_at

  let interpretation: LuccaInterpretation
  let merged: QualificationState
  let action: LuccaNextAction
  let responseId: string | null = null
  let model: string | null = null

  if (cached) {
    action = cached.action
    merged = cached.merged
    interpretation = cached.interpretation
    responseId = cached.response_id
    model = cached.model
  } else if (!text && hasUnsupportedMedia) {
    action = getNextQualificationAction(current)
    merged = current
    const mediaReply = 'Recebi sua mídia, mas não consigo analisar esse conteúdo com segurança. Pode me responder em texto? Se preferir, deixo para o Caio continuar.'
    interpretation = {
      reply: isFirst
        ? `${buildInitialFallbackReply({
            date: new Date(), timeZone: config.timeZone, firstName, treatment,
            nextAction: action, businessType: current.business_type,
          })} ${mediaReply}`
        : mediaReply,
      intendedNextAction: action,
      city: { answered: false, refused: false, value: null, numericValue: null },
      digitalExperience: { answered: false, refused: false, value: null, numericValue: null },
      teamSize: { answered: false, refused: false, value: null, numericValue: null },
      businessType: current.business_type,
      asksIfAi: false,
      requestsHuman: false,
      requestsStop: false,
      questionForCaio: null,
    }
  } else {
    try {
      const result = await interpretWithOpenAI({
        contactId: contact.id,
        inboundText: text || '[mídia sem texto]',
        existing: current,
        expectedNextAction: getNextQualificationAction(current),
        isFirstReply: isFirst,
        greeting: getGreeting(new Date(), config.timeZone),
        firstName,
        treatment,
        recentConversation,
        config,
      })
      interpretation = result.interpretation
      responseId = result.responseId
      model = result.model
      merged = mergeQualificationState(current, interpretation)
      action = interpretation.requestsStop || asksToStop(text)
        ? 'stop'
        : interpretation.requestsHuman || asksForHuman(text)
          ? 'handoff'
          : getNextQualificationAction(merged)

      const valid = interpretation.intendedNextAction === action && validateLuccaReply({
        reply: interpretation.reply,
        expectedAction: action,
        inboundText: text,
        isFirstReply: isFirst,
        maxCharacters: config.maxOutputCharacters,
        requiredGreeting: getGreeting(new Date(), config.timeZone),
        requiredFirstName: firstName,
        treatment,
      })
      if (!valid) {
        interpretation.reply = isFirst
          ? buildInitialFallbackReply({
              date: new Date(), timeZone: config.timeZone, firstName, treatment,
              nextAction: action, businessType: merged.business_type,
            })
          : buildFallbackReply({ nextField: action, firstName, businessType: merged.business_type })
        if (isDirectAiQuestion(text)) {
          interpretation.reply = isFirst
            ? `${interpretation.reply} E, respondendo à sua pergunta: sou um assistente virtual da QCM.`
            : `Sou um assistente virtual da QCM. ${interpretation.reply}`
        }
        interpretation.intendedNextAction = action
      }
      if (interpretation.questionForCaio && !/\bCaio\b/i.test(interpretation.reply)) {
        interpretation.reply = `${interpretation.reply} Vou deixar essa dúvida registrada para o Caio.`
      }
    } catch (error) {
      console.warn('[lucca] OpenAI indisponível; usando contingência.', {
        qualification_id: qualification.id,
        error: sanitizeAutomationError(error),
      })
      const fallback = fallbackInterpretation({
        text, current, isFirst, date: new Date(), timeZone: config.timeZone, firstName, treatment,
      })
      interpretation = fallback.interpretation
      merged = fallback.merged
      action = fallback.action
    }
  }

  const reply = String(cached?.reply ?? interpretation.reply).slice(0, config.maxOutputCharacters)
  const dispatchEventKey = String(
    cached?.dispatch_event_key ??
      `lucca:reply:${qualification.id}:${messages[messages.length - 1].whatsapp_message_id ?? messages[messages.length - 1].id}`
  )
  if (!cached) {
    const { data: savedDraft, error: draftError } = await supabase.from('lucca_jobs').update({
      output: {
        reply,
        dispatch_event_key: dispatchEventKey,
        action,
        merged,
        interpretation,
        response_id: responseId,
        model,
        message_ids: messages.map((message: any) => message.id),
      },
    }).eq('id', job.id).eq('status', 'processing').select('id').maybeSingle()
    if (draftError || !savedDraft?.id) {
      return { success: false, retryable: true, error: draftError?.message ?? 'Não foi possível persistir a resposta antes do envio.' }
    }
  }

  const { data: fresh } = await supabase
    .from('lucca_qualifications')
    .select('status')
    .eq('id', qualification.id)
    .maybeSingle()
  if (fresh?.status !== 'active' || !isWithinLuccaWindow(new Date(), config)) {
    return { success: true, skipped: true }
  }

  const { error: cancelAutomationError } = await supabase.from('automation_queue').update({
    status: 'cancelled',
    processed_at: new Date().toISOString(),
    error_message: 'Pausada durante qualificação do Lucca.',
  }).eq('workspace_id', job.workspace_id).eq('contact_id', job.contact_id).eq('status', 'pending')
  if (cancelAutomationError) {
    return {
      success: false,
      retryable: true,
      error: `Falha ao pausar automações concorrentes: ${cancelAutomationError.message}`,
    }
  }

  const phone = normalizeWhatsAppPhone(contact.phone ?? '')
  if (!phone) return { success: false, retryable: false, error: 'Contato sem telefone válido.' }
  const resolved = await getWhatsAppProviderForWorkspace(job.workspace_id)
  if (!resolved.provider || resolved.provider.name !== 'twilio') {
    return { success: false, retryable: true, error: resolved.error?.error ?? 'Twilio indisponível.' }
  }
  const result = await sendWithDispatch({
    workspaceId: job.workspace_id,
    contactId: job.contact_id,
    eventKey: dispatchEventKey,
    provider: 'twilio',
    operation: 'text',
    requestFingerprint: buildRequestFingerprint({ to: phone, text: reply }),
    send: () => resolved.provider!.sendText({ to: phone, text: reply }),
  })
  if (!result.success) return result

  const sentAt = new Date()
  const persisted = await persistWhatsAppMessage({
    workspaceId: job.workspace_id,
    contactId: job.contact_id,
    provider: 'twilio',
    whatsappMessageId: result.messageId ?? null,
    direction: 'outbound',
    content: reply,
    mediaType: 'text',
    status: 'sent',
    senderType: 'automation',
    automatedBy: 'lucca',
    createdAt: sentAt.toISOString(),
    activityContent: `Lucca respondeu via WhatsApp: ${reply.slice(0, 100)}`,
  })
  if (persisted.error) return { success: false, retryable: true, error: persisted.error }

  const rawResponses = Array.isArray(qualification.raw_responses) ? qualification.raw_responses : []
  const receptionAt = qualification.reception_sent_at ?? sentAt.toISOString()
  const slaMs = qualification.reception_sent_at
    ? qualification.response_sla_ms
    : sentAt.getTime() - new Date(qualification.initial_received_at).getTime()
  const nextStatus = action === 'complete'
    ? 'qualified'
    : action === 'handoff'
      ? 'awaiting_human'
      : action === 'stop'
        ? 'opted_out'
        : 'active'
  const combinedRawResponses = [
    ...rawResponses,
    ...messages.map((message: any) => ({
      message_id: message.id,
      received_at: message.created_at,
      text: String(message.content ?? '').slice(0, 2_000),
      extraction: interpretation,
    })),
  ].slice(-30)
  const questionsForCaio = Array.from(new Set(
    combinedRawResponses
      .map((entry: any) => entry?.extraction?.questionForCaio)
      .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value: string) => value.trim().slice(0, 500))
  ))
  const baseSummary = buildQualificationSummary(merged)
  const update = {
    ...merged,
    status: nextStatus,
    current_step: getStepForAction(action),
    reception_sent_at: receptionAt,
    completed_at: action === 'complete' ? sentAt.toISOString() : qualification.completed_at,
    paused_at: ['handoff', 'stop'].includes(action) ? sentAt.toISOString() : qualification.paused_at,
    pause_reason: action === 'handoff' ? 'lead_requested_human' : action === 'stop' ? 'lead_opted_out' : qualification.pause_reason,
    last_outbound_at: sentAt.toISOString(),
    last_processed_message_id: messages[messages.length - 1].id,
    summary: questionsForCaio.length > 0
      ? `${baseSummary}\nDúvida(s) para Caio: ${questionsForCaio.join(' | ')}`
      : baseSummary,
    raw_responses: combinedRawResponses,
    openai_model: model,
    openai_response_id: responseId,
    response_sla_ms: slaMs,
    response_sla_breached: Boolean(slaMs && slaMs > 120_000),
    version: qualification.version + 1,
  }
  const { error: updateError } = await supabase
    .from('lucca_qualifications')
    .update(update)
    .eq('id', qualification.id)
    .eq('status', 'active')
  if (updateError) return { success: false, retryable: true, error: updateError.message }

  const coalescedIds = pendingForBatch.map((row: any) => row.id)
  if (coalescedIds.length > 0) {
    await supabase.from('lucca_jobs').update({
      status: 'done', processed_at: sentAt.toISOString(), last_error: 'Coalescido no turno anterior.',
    }).in('id', coalescedIds).eq('status', 'pending')
  }
  if (nextStatus !== 'active') {
    await supabase.from('lucca_jobs').update({
      status: 'cancelled', processed_at: sentAt.toISOString(), last_error: `Qualificação encerrada: ${nextStatus}.`,
    }).eq('qualification_id', qualification.id).eq('job_type', 'conversation').eq('status', 'pending')
  }
  if (interpretation.questionForCaio) {
    await supabase.from('activities').insert({
      workspace_id: job.workspace_id,
      contact_id: job.contact_id,
      user_id: null,
      type: 'whatsapp',
      content: `Dúvida registrada para Caio: ${interpretation.questionForCaio.slice(0, 500)}`,
      created_at: sentAt.toISOString(),
    })
  }
  return result
}

export async function processLuccaQueue(options?: { qualificationId?: string }): Promise<WorkerSummary> {
  const started = Date.now()
  const config = getLuccaConfig()
  const summary: WorkerSummary = {
    enabled: config.enabled,
    recovered: 0,
    paused: 0,
    claimed: 0,
    succeeded: 0,
    rescheduled: 0,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
  }
  if (!config.enabled || !config.workspaceId) return { ...summary, duration_ms: Date.now() - started }

  const supabase = createAdminClient() as any
  const now = new Date()
  summary.recovered = await recoverExpiredJobs(supabase, now)
  summary.paused = await pauseOutsideWindow(supabase, now)
  if (!isWithinLuccaWindow(now, config)) return { ...summary, duration_ms: Date.now() - started }

  let pendingQuery = supabase
    .from('lucca_jobs')
    .select('*')
    .eq('workspace_id', config.workspaceId)
    .eq('status', 'pending')
    .lte('scheduled_for', now.toISOString())
  if (options?.qualificationId) {
    pendingQuery = pendingQuery.eq('qualification_id', options.qualificationId)
  }
  const { data: rows, error } = await pendingQuery
    .order('scheduled_for', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(config.workerBatchSize)
  if (error) throw new Error(`lucca_queue_lookup_failed:${error.message}`)

  const workerId = crypto.randomUUID()
  for (const row of (rows ?? []) as Job[]) {
    if (row.attempts >= row.max_attempts) {
      const { data: exhausted } = await supabase
        .from('lucca_jobs')
        .update({
          status: 'failed',
          processed_at: now.toISOString(),
          last_error: 'Limite de tentativas atingido.',
        })
        .eq('id', row.id)
        .eq('status', 'pending')
        .gte('attempts', row.max_attempts)
        .select('id')
        .maybeSingle()
      if (exhausted?.id) summary.failed++
      continue
    }
    let job: Job | null = null
    try {
      job = await claimJob(supabase, row, workerId)
      if (!job) continue
      summary.claimed++
      const result: {
        success: boolean
        retryable?: boolean
        error?: unknown
        skipped?: boolean
      } = job.job_type === 'notification'
        ? await processNotification(supabase, job)
        : await processConversation(supabase, job)
      if (result.success) {
        if (await finishJob(supabase, job, workerId)) {
          if (result.skipped) summary.skipped++
          else summary.succeeded++
        }
      } else {
        const state = await failJob(supabase, job, workerId, result.error, result.retryable !== false)
        if (state === 'rescheduled') summary.rescheduled++
        if (state === 'failed') summary.failed++
      }
    } catch (error) {
      if (!job) {
        console.error('[lucca] falha ao adquirir job.', { job_id: row.id, error: sanitizeAutomationError(error) })
        continue
      }
      const state = await failJob(supabase, job, workerId, error, true)
      if (state === 'rescheduled') summary.rescheduled++
      if (state === 'failed') summary.failed++
    }
  }
  summary.duration_ms = Date.now() - started
  console.info('[lucca] fila processada.', { ...summary, worker_id: workerId })
  return summary
}
