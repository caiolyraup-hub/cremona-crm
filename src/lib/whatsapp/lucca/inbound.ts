/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeTwilioWhatsAppAddress } from '@/lib/whatsapp/providers'
import { getLuccaConfig, isCaioNotificationNumber, isLuccaWorkspaceEligible } from './config'
import { isWithinLuccaWindow } from './time'

type FormPayload = Record<string, string>

type EnqueueInput = {
  workspaceId: string
  contactId: string
  contactPhone: string
  sender: string
  messageId: string
  messageSid: string
  messageText: string | null
  mediaType: string
  receivedAt: string
  payload: FormPayload
}

function compactString(value: string | null | undefined, maximum = 1_000) {
  const text = value?.trim()
  return text ? text.slice(0, maximum) : null
}

export function extractTwilioReferral(payload: FormPayload) {
  const referral = {
    source_id: compactString(payload.ReferralSourceId, 200),
    source_type: compactString(payload.ReferralSourceType, 100),
    source_url: compactString(payload.ReferralSourceUrl, 1_000),
    headline: compactString(payload.ReferralHeadline, 500),
    body: compactString(payload.ReferralBody, 1_000),
    ctwa_clid: compactString(payload.ReferralCtwaClid, 500),
    media_id: compactString(payload.ReferralMediaId, 300),
    media_content_type: compactString(payload.ReferralMediaContentType, 200),
    media_url: compactString(payload.ReferralMediaUrl, 1_000),
    media_count: Number.isFinite(Number(payload.ReferralNumMedia))
      ? Number(payload.ReferralNumMedia)
      : null,
  }
  return Object.values(referral).some((value) => value !== null) ? referral : null
}

async function resolveAttribution(params: {
  supabase: any
  workspaceId: string
  contactId: string
  receivedAt: string
  payload: FormPayload
  lookbackDays: number
}) {
  const referral = extractTwilioReferral(params.payload)
  if (referral) {
    return {
      origin: { channel: 'whatsapp', provider: 'twilio', referral },
      evidence: 'twilio_referral' as const,
      submissionId: null,
    }
  }

  const received = new Date(params.receivedAt)
  const cutoff = new Date(received.getTime() - params.lookbackDays * 86_400_000).toISOString()
  const { data } = await params.supabase
    .from('lead_submissions')
    .select('id, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at')
    .eq('workspace_id', params.workspaceId)
    .eq('contact_id', params.contactId)
    .gte('created_at', cutoff)
    .lte('created_at', params.receivedAt)
    .in('status', ['processed', 'duplicate'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data?.id) {
    return {
      origin: {
        channel: 'lead_submission',
        source: data.source,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_content: data.utm_content,
        utm_term: data.utm_term,
        matched_by: 'contact_id_and_recency',
        lookback_days: params.lookbackDays,
        submitted_at: data.created_at,
      },
      evidence: 'lead_submission' as const,
      submissionId: data.id as string,
    }
  }

  return {
    origin: { channel: 'whatsapp', provider: 'twilio', attribution: 'unidentified' },
    evidence: 'unidentified' as const,
    submissionId: null,
  }
}

async function cancelCompetingAutomations(supabase: any, workspaceId: string, contactId: string) {
  const { error } = await supabase
    .from('automation_queue')
    .update({
      status: 'cancelled',
      processed_at: new Date().toISOString(),
      error_message: 'Pausada durante qualificação do Lucca.',
    })
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('status', 'pending')
  if (error) throw new Error(`lucca_competing_automation_cancel_failed:${error.message}`)
}

const RECENT_HUMAN_INTERVENTION_HOURS = 24

async function hasRecentHumanIntervention(params: {
  supabase: any
  workspaceId: string
  contactId: string
  currentMessageId: string
  receivedAt: string
}) {
  const receivedAt = new Date(params.receivedAt)
  const cutoff = new Date(
    receivedAt.getTime() - RECENT_HUMAN_INTERVENTION_HOURS * 60 * 60 * 1_000
  ).toISOString()
  const { data: recentHumanMessage, error } = await params.supabase
    .from('messages')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('contact_id', params.contactId)
    .neq('id', params.currentMessageId)
    .eq('direction', 'outbound')
    .eq('sender_type', 'human')
    .gte('created_at', cutoff)
    .lte('created_at', params.receivedAt)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`lucca_human_intervention_lookup_failed:${error.message}`)
  return Boolean(recentHumanMessage?.id)
}

async function enqueueConversationJob(params: {
  supabase: any
  qualificationId: string
  input: EnqueueInput
  maxAttempts: number
}) {
  const { error } = await params.supabase.from('lucca_jobs').insert({
    workspace_id: params.input.workspaceId,
    contact_id: params.input.contactId,
    qualification_id: params.qualificationId,
    message_id: params.input.messageId,
    job_type: 'conversation',
    event_key: `lucca:conversation:${params.input.messageSid}`,
    status: 'pending',
    max_attempts: params.maxAttempts,
  })
  if (error && error.code !== '23505') throw new Error(`lucca_job_insert_failed:${error.message}`)
}

export async function enqueueLuccaInbound(input: EnqueueInput) {
  const config = getLuccaConfig()
  if (!isLuccaWorkspaceEligible({ workspaceId: input.workspaceId, sender: input.sender, config })) {
    return { enqueued: false, reason: 'workspace_or_feature_disabled' }
  }
  if (isCaioNotificationNumber(input.contactPhone, config)) {
    return { enqueued: false, reason: 'internal_notification_number' }
  }

  const supabase = createAdminClient() as any
  const receivedAt = new Date(input.receivedAt)
  const withinWindow = isWithinLuccaWindow(receivedAt, config)
  const { data: existing, error: existingError } = await supabase
    .from('lucca_qualifications')
    .select('id, status')
    .eq('workspace_id', input.workspaceId)
    .eq('contact_id', input.contactId)
    .maybeSingle()

  if (existingError) throw new Error(`lucca_state_lookup_failed:${existingError.message}`)

  if (existing?.id) {
    if (existing.status !== 'active') {
      return { enqueued: false, reason: `qualification_${existing.status}` }
    }
    if (!withinWindow) {
      await supabase
        .from('lucca_qualifications')
        .update({
          status: 'awaiting_human',
          paused_at: input.receivedAt,
          pause_reason: 'outside_operating_window',
          last_inbound_at: input.receivedAt,
        })
        .eq('id', existing.id)
        .eq('status', 'active')
      await supabase
        .from('lucca_jobs')
        .update({ status: 'cancelled', processed_at: input.receivedAt, last_error: 'Fora do horário do Lucca.' })
        .eq('qualification_id', existing.id)
        .eq('status', 'pending')
      return { enqueued: false, reason: 'outside_operating_window' }
    }

    await supabase
      .from('lucca_qualifications')
      .update({ last_inbound_at: input.receivedAt })
      .eq('id', existing.id)
      .eq('status', 'active')
    await cancelCompetingAutomations(supabase, input.workspaceId, input.contactId)
    await enqueueConversationJob({
      supabase,
      qualificationId: existing.id,
      input,
      maxAttempts: config.maxAttempts,
    })
    return { enqueued: true, qualificationId: existing.id, created: false }
  }

  if (!withinWindow) return { enqueued: false, reason: 'outside_operating_window' }
  if (await hasRecentHumanIntervention({
    supabase,
    workspaceId: input.workspaceId,
    contactId: input.contactId,
    currentMessageId: input.messageId,
    receivedAt: input.receivedAt,
  })) {
    return { enqueued: false, reason: 'recent_human_intervention' }
  }

  const attribution = await resolveAttribution({
    supabase,
    workspaceId: input.workspaceId,
    contactId: input.contactId,
    receivedAt: input.receivedAt,
    payload: input.payload,
    lookbackDays: config.attributionLookbackDays,
  })
  const { data: created, error: createError } = await supabase
    .from('lucca_qualifications')
    .insert({
      workspace_id: input.workspaceId,
      contact_id: input.contactId,
      first_message_id: input.messageId,
      first_message_text: compactString(input.messageText, 2_000),
      initial_received_at: input.receivedAt,
      last_inbound_at: input.receivedAt,
      status: 'active',
      current_step: 1,
      origin: attribution.origin,
      origin_evidence: attribution.evidence,
      attribution_submission_id: attribution.submissionId,
    })
    .select('id')
    .maybeSingle()

  if (createError && createError.code !== '23505') {
    throw new Error(`lucca_state_create_failed:${createError.message}`)
  }

  let qualificationId = created?.id as string | undefined
  if (!qualificationId) {
    const { data: concurrent } = await supabase
      .from('lucca_qualifications')
      .select('id, status')
      .eq('workspace_id', input.workspaceId)
      .eq('contact_id', input.contactId)
      .maybeSingle()
    if (!concurrent?.id || concurrent.status !== 'active') {
      return { enqueued: false, reason: 'concurrent_ineligible_state' }
    }
    qualificationId = concurrent.id
  }

  if (!qualificationId) throw new Error('lucca_qualification_id_missing')
  const durableQualificationId = qualificationId

  await Promise.all([
    enqueueConversationJob({
      supabase,
      qualificationId: durableQualificationId,
      input,
      maxAttempts: config.maxAttempts,
    }),
    supabase.from('lucca_jobs').insert({
      workspace_id: input.workspaceId,
      contact_id: input.contactId,
      qualification_id: durableQualificationId,
      message_id: input.messageId,
      job_type: 'notification',
      event_key: `lucca:notification:${durableQualificationId}`,
      status: 'pending',
      max_attempts: config.maxAttempts,
    }).then(({ error }: { error: { code?: string; message: string } | null }) => {
      if (error && error.code !== '23505') throw new Error(`lucca_notification_job_failed:${error.message}`)
    }),
    cancelCompetingAutomations(supabase, input.workspaceId, input.contactId),
    supabase.from('activities').insert({
      workspace_id: input.workspaceId,
      contact_id: input.contactId,
      user_id: null,
      type: 'whatsapp',
      content: 'Lucca iniciou a qualificação noturna deste atendimento.',
      created_at: input.receivedAt,
    }),
  ])

  return { enqueued: true, qualificationId: durableQualificationId, created: true }
}

export function normalizeInboundContactAddress(value: string) {
  return normalizeTwilioWhatsAppAddress(value)
}
