/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrUpdateContact, CreateContactError } from '@/lib/contacts/create-contact'
import { normalizeTags } from '@/lib/contacts/normalize'
import {
  buildPayloadHash,
  extractLeadSourceKey,
  hashLeadSourceKey,
  sha256Hex,
} from '@/lib/leads/security'
import {
  MAX_LEAD_BODY_BYTES,
  validateLeadPayload,
  validateOrigin,
  type ValidLeadPayload,
} from '@/lib/leads/validation'

export const runtime = 'nodejs'

type LeadSourceRow = {
  id: string
  workspace_id: string
  name: string
  slug: string
  active: boolean
  default_tags: string[]
  default_pipeline_stage_id: string | null
  allowed_origins: string[]
  rate_limit_per_minute: number
}

type LeadSubmissionRow = {
  id: string
  contact_id: string | null
  status: string
}

function corsHeaders(origin: string | null, allowed = false) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, X-Cremona-Lead-Key, Content-Type, Idempotency-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }

  if (origin && allowed) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

function json(data: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

function safeError(message: string, status = 400, headers?: HeadersInit) {
  return json({ success: false, error: message }, { status, headers })
}

async function authenticateLeadSource(supabase: any, request: Request) {
  const key = extractLeadSourceKey(request.headers)
  if (!key) {
    return { source: null, response: safeError('Chave da origem ausente.', 401) }
  }

  const keyHash = hashLeadSourceKey(key)
  const { data, error } = await supabase
    .from('lead_sources')
    .select([
      'id',
      'workspace_id',
      'name',
      'slug',
      'active',
      'default_tags',
      'default_pipeline_stage_id',
      'allowed_origins',
      'rate_limit_per_minute',
    ].join(', '))
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) {
    return { source: null, response: safeError('Nao foi possivel autenticar a origem.', 500) }
  }

  const source = data as LeadSourceRow | null
  if (!source) return { source: null, response: safeError('Chave da origem invalida.', 401) }
  if (!source.active) return { source: null, response: safeError('Origem de lead inativa.', 403) }

  return { source, response: null }
}

async function checkRateLimit(params: {
  supabase: any
  source: LeadSourceRow
  request: Request
}): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const windowStartedAt = new Date(Date.now() - 60_000).toISOString()
  const { count, error } = await params.supabase
    .from('lead_rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('lead_source_id', params.source.id)
    .gte('created_at', windowStartedAt)

  if (!error && typeof count === 'number' && count >= params.source.rate_limit_per_minute) {
    return { allowed: false, retryAfter: 60 }
  }

  const ipPrefix = (params.request.headers.get('x-forwarded-for') ?? 'unknown')
    .split(',')[0]
    .trim()
    .replace(/\.\d+$/, '.0')
  const userAgent = params.request.headers.get('user-agent') ?? ''

  await params.supabase.from('lead_rate_limit_events').insert({
    lead_source_id: params.source.id,
    request_hash: sha256Hex(`${params.source.id}:${ipPrefix}:${userAgent.slice(0, 120)}`),
  })

  return { allowed: true }
}

async function readJsonBody(request: Request): Promise<{ body?: unknown; raw?: string; error?: string }> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return { error: 'Content-Type deve ser application/json.' }
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_LEAD_BODY_BYTES) {
    return { error: 'Payload excede o tamanho maximo permitido.' }
  }

  try {
    return { body: JSON.parse(raw), raw }
  } catch {
    return { error: 'JSON invalido.' }
  }
}

async function findIdempotentSubmission(params: {
  supabase: any
  sourceId: string
  idempotencyKey: string | null
  externalLeadId: string | null
  payloadHash: string
}): Promise<LeadSubmissionRow | null> {
  const selectors = [
    params.idempotencyKey
      ? { column: 'idempotency_key', value: params.idempotencyKey }
      : null,
    params.externalLeadId
      ? { column: 'external_lead_id', value: params.externalLeadId }
      : null,
    { column: 'payload_hash', value: params.payloadHash },
  ].filter(Boolean) as Array<{ column: string; value: string }>

  for (const selector of selectors) {
    const { data, error } = await params.supabase
      .from('lead_submissions')
      .select('id, contact_id, status')
      .eq('lead_source_id', params.sourceId)
      .eq(selector.column, selector.value)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data as LeadSubmissionRow
  }

  return null
}

function idempotentResponse(submission: LeadSubmissionRow, headers?: HeadersInit) {
  if (submission.status === 'failed' || submission.status === 'rejected') {
    return json({
      success: false,
      submission_id: submission.id,
      contact_id: submission.contact_id,
      idempotent_replay: true,
      automation_enqueued: false,
      error: 'Submissao anterior nao foi processada.',
    }, { status: 409, headers })
  }

  return json({
    success: true,
    submission_id: submission.id,
    contact_id: submission.contact_id,
    created: false,
    idempotent_replay: true,
    automation_enqueued: false,
  }, { headers })
}

function leadSubmissionPayload(params: {
  source: LeadSourceRow
  payload: ValidLeadPayload
  payloadHash: string
  idempotencyKey: string | null
}) {
  const optInAt = params.payload.whatsappOptIn
    ? params.payload.whatsappOptInAt ?? new Date().toISOString()
    : null

  return {
    workspace_id: params.source.workspace_id,
    lead_source_id: params.source.id,
    external_lead_id: params.payload.externalLeadId,
    idempotency_key: params.idempotencyKey,
    payload_hash: params.payloadHash,
    status: 'received',
    name: params.payload.name,
    phone: params.payload.phone,
    email: params.payload.email,
    source: params.payload.source ?? params.source.slug,
    whatsapp_opt_in: params.payload.whatsappOptIn,
    whatsapp_opt_in_at: optInAt,
    whatsapp_opt_in_source: params.payload.source ?? params.source.slug,
    whatsapp_opt_in_text: params.payload.whatsappOptInText,
    utm_source: params.payload.utmSource,
    utm_medium: params.payload.utmMedium,
    utm_campaign: params.payload.utmCampaign,
    utm_content: params.payload.utmContent,
    utm_term: params.payload.utmTerm,
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return new NextResponse('', { status: 204, headers: corsHeaders(origin, Boolean(origin)) })
}

export async function POST(request: Request) {
  const supabase = createAdminClient()
  const origin = request.headers.get('origin')

  const auth = await authenticateLeadSource(supabase, request)
  if (auth.response || !auth.source) return auth.response
  const source = auth.source

  if (!validateOrigin(origin, source.allowed_origins)) {
    return safeError('Origin nao autorizado para esta origem de lead.', 403, corsHeaders(origin))
  }

  const cors = corsHeaders(origin, Boolean(origin))
  const rate = await checkRateLimit({ supabase, source, request })
  if (!rate.allowed) {
    return safeError('Rate limit excedido.', 429, {
      ...cors,
      'Retry-After': String(rate.retryAfter),
    })
  }

  const parsed = await readJsonBody(request)
  if (parsed.error) return safeError(parsed.error, 400, cors)

  const validation = validateLeadPayload(parsed.body)
  if (validation.error || !validation.payload) {
    return safeError(validation.error ?? 'Payload invalido.', 400, cors)
  }

  const payloadHash = buildPayloadHash(validation.payload)
  const idempotencyKey = request.headers.get('idempotency-key')?.trim().slice(0, 200) || null
  const existing = await findIdempotentSubmission({
    supabase,
    sourceId: source.id,
    idempotencyKey,
    externalLeadId: validation.payload.externalLeadId,
    payloadHash,
  })

  if (existing) {
    return idempotentResponse(existing, cors)
  }

  const { data: insertedSubmission, error: insertSubmissionError } = await supabase
    .from('lead_submissions')
    .insert(leadSubmissionPayload({
      source,
      payload: validation.payload,
      payloadHash,
      idempotencyKey,
    }))
    .select('id')
    .maybeSingle()

  if (insertSubmissionError) {
    if (insertSubmissionError.code === '23505') {
      const replay = await findIdempotentSubmission({
        supabase,
        sourceId: source.id,
        idempotencyKey,
        externalLeadId: validation.payload.externalLeadId,
        payloadHash,
      })
      if (replay) return idempotentResponse(replay, cors)
    }
    return safeError('Nao foi possivel registrar a submissao.', 500, cors)
  }

  const submissionId = insertedSubmission?.id as string | undefined
  if (!submissionId) return safeError('Nao foi possivel registrar a submissao.', 500, cors)

  try {
    const tags = normalizeTags(validation.payload.tags, source.default_tags ?? []).tags
    const leadCustomFields = {
      ...validation.payload.customFields,
      lead_source_id: source.id,
      lead_source_slug: source.slug,
      latest_lead_submission_id: submissionId,
      utm_source: validation.payload.utmSource,
      utm_medium: validation.payload.utmMedium,
      utm_campaign: validation.payload.utmCampaign,
      utm_content: validation.payload.utmContent,
      utm_term: validation.payload.utmTerm,
    }

    const contactResult = await createOrUpdateContact({
      workspaceId: source.workspace_id,
      name: validation.payload.name,
      phone: validation.payload.phone,
      email: validation.payload.email,
      company: validation.payload.company,
      position: validation.payload.position,
      tags,
      pipelineStageId: source.default_pipeline_stage_id,
      customFields: leadCustomFields,
      source: validation.payload.source ?? source.slug,
      externalLeadId: validation.payload.externalLeadId,
      whatsappOptIn: validation.payload.whatsappOptIn,
      whatsappOptInAt: validation.payload.whatsappOptInAt ?? new Date().toISOString(),
      whatsappOptInSource: validation.payload.source ?? source.slug,
      whatsappOptInText: validation.payload.whatsappOptInText,
      activityContent: validation.payload.whatsappOptIn
        ? 'Lead criado com consentimento para WhatsApp.'
        : 'Lead criado sem consentimento para WhatsApp.',
    }, supabase)

    const finalStatus = contactResult.created ? 'processed' : 'duplicate'
    await supabase
      .from('lead_submissions')
      .update({
        contact_id: contactResult.contactId,
        status: finalStatus,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .eq('workspace_id', source.workspace_id)

    return new NextResponse(JSON.stringify({
      success: true,
      submission_id: submissionId,
      contact_id: contactResult.contactId,
      created: contactResult.created,
      duplicate: !contactResult.created || undefined,
      automation_enqueued: contactResult.automationEnqueued,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof CreateContactError
      ? error.message
      : 'Nao foi possivel processar o lead.'

    await supabase
      .from('lead_submissions')
      .update({
        status: 'failed',
        error_message: message,
        processed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .eq('workspace_id', source.workspace_id)

    return safeError(message, error instanceof CreateContactError ? 400 : 500, cors)
  }
}
