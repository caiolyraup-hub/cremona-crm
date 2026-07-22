/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { runAutomationsForEvent } from '@/lib/automations/engine'
import {
  buildContactPhoneCandidates,
  mergeCustomFields,
  mergeTags,
  normalizeBrazilianPhone,
  normalizeCustomFields,
  normalizeEmail,
  normalizeOptionalString,
  normalizeTags,
} from './normalize'
import type { Json, Tables } from '@/types/database'

export type CreateContactInput = {
  workspaceId: string
  name: string
  phone?: string | null
  email?: string | null
  company?: string | null
  position?: string | null
  tags?: string[]
  pipelineStageId?: string | null
  customFields?: Record<string, unknown>
  source?: string | null
  externalLeadId?: string | null
  whatsappOptIn?: boolean
  whatsappOptInAt?: string | null
  whatsappOptInSource?: string | null
  whatsappOptInText?: string | null
  activityContent?: string | null
  emitContactCreated?: boolean
}

export type CreateContactResult = {
  contactId: string
  created: boolean
  updated: boolean
  duplicateReason?: 'phone' | 'email' | 'external_lead_id'
  automationEnqueued: boolean
  automationQueueCount: number
}

export class CreateContactError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreateContactError'
  }
}

type ContactRow = Tables<'contacts'> & {
  source?: string | null
  external_lead_id?: string | null
  whatsapp_opt_in?: boolean | null
  whatsapp_opt_in_at?: string | null
  whatsapp_opt_in_source?: string | null
  whatsapp_opt_in_text?: string | null
  last_lead_submission_at?: string | null
}

function assertValidIsoDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function firstNonEmpty<T>(current: T | null | undefined, next: T | null | undefined): T | null | undefined {
  return current ?? next
}

async function fetchDuplicate(params: {
  supabase: any
  workspaceId: string
  phone: string | null
  email: string | null
  externalLeadId: string | null
}): Promise<{ contact: ContactRow | null; reason?: CreateContactResult['duplicateReason'] }> {
  const { supabase, workspaceId, phone, email, externalLeadId } = params

  if (externalLeadId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('external_lead_id', externalLeadId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) throw new CreateContactError('Nao foi possivel verificar duplicidade por origem.')
    if (data) return { contact: data as ContactRow, reason: 'external_lead_id' }
  }

  if (phone) {
    const candidates = buildContactPhoneCandidates(phone)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .in('phone', candidates)
      .limit(1)
      .maybeSingle()

    if (error) throw new CreateContactError('Nao foi possivel verificar duplicidade por telefone.')
    if (data) return { contact: data as ContactRow, reason: 'phone' }
  }

  if (email) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .ilike('email', email)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (error) throw new CreateContactError('Nao foi possivel verificar duplicidade por e-mail.')
    if (data) return { contact: data as ContactRow, reason: 'email' }
  }

  return { contact: null }
}

async function insertActivity(params: {
  supabase: any
  workspaceId: string
  contactId: string
  content: string | null | undefined
}) {
  if (!params.content) return

  await params.supabase.from('activities').insert({
    workspace_id: params.workspaceId,
    contact_id: params.contactId,
    user_id: null,
    type: 'note',
    content: params.content,
  })
}

export async function createOrUpdateContact(
  input: CreateContactInput,
  client?: any
): Promise<CreateContactResult> {
  const supabase = client ?? createAdminClient()
  const workspaceId = input.workspaceId
  const name = normalizeOptionalString(input.name, 160)
  if (!name) throw new CreateContactError('Nome obrigatorio.')

  const phoneResult = normalizeBrazilianPhone(input.phone, false)
  if (phoneResult.error) throw new CreateContactError(phoneResult.error)

  const emailResult = normalizeEmail(input.email)
  if (emailResult.error) throw new CreateContactError(emailResult.error)

  const company = normalizeOptionalString(input.company, 160)
  const position = normalizeOptionalString(input.position, 120)
  const source = normalizeOptionalString(input.source, 120)
  const externalLeadId = normalizeOptionalString(input.externalLeadId, 200)
  const pipelineStageId = normalizeOptionalString(input.pipelineStageId, 80)
  const optInAt = assertValidIsoDate(input.whatsappOptInAt ?? null) ?? new Date().toISOString()
  const optInSource = normalizeOptionalString(input.whatsappOptInSource, 200)
  const optInText = normalizeOptionalString(input.whatsappOptInText, 1000)
  const tagsResult = normalizeTags(input.tags ?? [])
  if (tagsResult.error) throw new CreateContactError(tagsResult.error)
  const customFieldsResult = normalizeCustomFields(input.customFields ?? {})
  if (customFieldsResult.error) throw new CreateContactError(customFieldsResult.error)

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()

  if (workspaceError) throw new CreateContactError('Nao foi possivel validar o workspace.')
  if (!workspace?.id) throw new CreateContactError('Workspace nao encontrado.')

  if (pipelineStageId) {
    const { data: stage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', pipelineStageId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (stageError || !stage?.id) throw new CreateContactError('Etapa do pipeline invalida.')
  }

  const duplicate = await fetchDuplicate({
    supabase,
    workspaceId,
    phone: phoneResult.phone,
    email: emailResult.email,
    externalLeadId,
  })

  const now = new Date().toISOString()
  if (duplicate.contact) {
    const contact = duplicate.contact
    const nextTags = mergeTags(contact.tags, tagsResult.tags)
    const nextCustomFields = mergeCustomFields(contact.custom_fields, customFieldsResult.customFields)
    const updates: Record<string, Json | string | string[] | boolean | null> = {
      tags: nextTags,
      custom_fields: nextCustomFields,
      last_lead_submission_at: now,
      updated_at: now,
    }

    const nextPhone = firstNonEmpty(contact.phone, phoneResult.phone)
    const nextEmail = firstNonEmpty(contact.email, emailResult.email)
    const nextCompany = firstNonEmpty(contact.company, company)
    const nextPosition = firstNonEmpty(contact.position, position)
    const nextStage = firstNonEmpty(contact.pipeline_stage_id, pipelineStageId)
    const nextSource = firstNonEmpty(contact.source, source)
    const nextExternalLeadId = firstNonEmpty(contact.external_lead_id, externalLeadId)

    if (nextPhone !== contact.phone) updates.phone = nextPhone ?? null
    if (nextEmail !== contact.email) updates.email = nextEmail ?? null
    if (nextCompany !== contact.company) updates.company = nextCompany ?? null
    if (nextPosition !== contact.position) updates.position = nextPosition ?? null
    if (nextStage !== contact.pipeline_stage_id) updates.pipeline_stage_id = nextStage ?? null
    if (nextSource !== contact.source) updates.source = nextSource ?? null
    if (nextExternalLeadId !== contact.external_lead_id) updates.external_lead_id = nextExternalLeadId ?? null

    if (input.whatsappOptIn === true && contact.whatsapp_opt_in !== true) {
      updates.whatsapp_opt_in = true
      updates.whatsapp_opt_in_at = optInAt
      updates.whatsapp_opt_in_source = optInSource ?? source
      updates.whatsapp_opt_in_text = optInText
    }

    const { error: updateError } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', contact.id)
      .eq('workspace_id', workspaceId)

    if (updateError) throw new CreateContactError('Nao foi possivel atualizar o contato existente.')

    await insertActivity({
      supabase,
      workspaceId,
      contactId: contact.id,
      content: input.activityContent ?? 'Nova submissao associada a contato existente.',
    })

    return {
      contactId: contact.id,
      created: false,
      updated: true,
      duplicateReason: duplicate.reason,
      automationEnqueued: false,
      automationQueueCount: 0,
    }
  }

  const insertPayload = {
    workspace_id: workspaceId,
    name,
    phone: phoneResult.phone,
    email: emailResult.email,
    company,
    position,
    tags: tagsResult.tags,
    pipeline_stage_id: pipelineStageId,
    custom_fields: customFieldsResult.customFields,
    source,
    external_lead_id: externalLeadId,
    whatsapp_opt_in: input.whatsappOptIn === true,
    whatsapp_opt_in_at: input.whatsappOptIn === true ? optInAt : null,
    whatsapp_opt_in_source: input.whatsappOptIn === true ? optInSource ?? source : null,
    whatsapp_opt_in_text: input.whatsappOptIn === true ? optInText : null,
    last_lead_submission_at: now,
  }

  const { data: created, error: insertError } = await supabase
    .from('contacts')
    .insert(insertPayload)
    .select('id')
    .maybeSingle()

  if (insertError || !created?.id) {
    throw new CreateContactError('Nao foi possivel criar o contato.')
  }

  const contactId = created.id as string
  await insertActivity({
    supabase,
    workspaceId,
    contactId,
    content: input.activityContent ?? 'Lead criado a partir de submissao externa.',
  })

  let automationQueueCount = 0
  if (input.emitContactCreated !== false) {
    const enqueueResult = await runAutomationsForEvent({
      type: 'contact_created',
      workspaceId,
      contactId,
    })
    automationQueueCount = enqueueResult.enqueued
  }

  return {
    contactId,
    created: true,
    updated: false,
    automationEnqueued: automationQueueCount > 0,
    automationQueueCount,
  }
}
