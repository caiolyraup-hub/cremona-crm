/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isMissingOnboardingSchemaError } from '@/lib/workspace-compat'
import { ensurePrimaryPipeline } from '@/lib/pipeline-defaults'

async function getWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data: member } = await (supabase as any)
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle() as { data: { workspace_id: string } | null }

  return member?.workspace_id ?? null
}

export async function updateOnboardingStep1Action(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) redirect('/login')

  const businessName = (formData.get('business_name') as string)?.trim()
  const businessType = (formData.get('business_type') as string)?.trim()

  const { error } = await (supabase as any)
    .from('workspaces')
    .update({ business_name: businessName || null, business_type: businessType || null })
    .eq('id', workspaceId)

  if (error && isMissingOnboardingSchemaError(error)) {
    const { error: legacyError } = await (supabase as any)
      .from('workspaces')
      .update({ name: businessName || 'Workspace' })
      .eq('id', workspaceId)

    if (legacyError) {
      throw new Error(legacyError.message)
    }
  } else if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard', 'layout')
}

export async function updatePipelineStagesAction(
  stages: Array<{ id?: string; name: string; color: string; position: number }>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) redirect('/login')

  const ensuredPipeline = await ensurePrimaryPipeline(supabase, workspaceId)
  if (ensuredPipeline.error || !ensuredPipeline.pipelineId) {
    throw new Error(ensuredPipeline.error ?? 'Nao foi possivel preparar o pipeline principal.')
  }

  const { data: existing } = await (supabase as any)
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('pipeline_id', ensuredPipeline.pipelineId)

  const existingIds: string[] = ((existing ?? []) as Array<{ id: string }>).map((stage) => stage.id)
  const incomingIds = new Set(stages.filter((stage) => stage.id).map((stage) => stage.id!))

  const toDelete = existingIds.filter((id) => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error: deleteError } = await (supabase as any)
      .from('pipeline_stages')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('pipeline_id', ensuredPipeline.pipelineId)
      .in('id', toDelete)

    if (deleteError) throw new Error(deleteError.message)
  }

  for (const stage of stages) {
    if (stage.id) {
      const { error } = await (supabase as any)
        .from('pipeline_stages')
        .update({
          name: stage.name,
          color: stage.color,
          position: stage.position,
          pipeline_id: ensuredPipeline.pipelineId,
        })
        .eq('id', stage.id)
        .eq('workspace_id', workspaceId)

      if (error) throw new Error(error.message)
    } else {
      const { error } = await (supabase as any)
        .from('pipeline_stages')
        .insert({
          workspace_id: workspaceId,
          pipeline_id: ensuredPipeline.pipelineId,
          name: stage.name,
          color: stage.color,
          position: stage.position,
        })

      if (error) throw new Error(error.message)
    }
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard/pipeline')
}

export async function createOnboardingContactsAction(
  contacts: Array<{ name: string; phone?: string; company?: string }>
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) redirect('/login')

  const rows = contacts
    .filter((contact) => contact.name.trim())
    .map((contact) => ({
      workspace_id: workspaceId,
      name: contact.name.trim(),
      phone: contact.phone?.trim() || null,
      company: contact.company?.trim() || null,
      pipeline_stage_id: null,
    }))

  if (rows.length > 0) {
    await (supabase as any).from('contacts').insert(rows)
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard/contacts')
  revalidatePath('/dashboard/pipeline')
}

export async function completeOnboardingAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaceId = await getWorkspaceId(supabase, user.id)
  if (!workspaceId) redirect('/login')

  const { error } = await (supabase as any)
    .from('workspaces')
    .update({ onboarding_completed: true })
    .eq('id', workspaceId)

  if (error && !isMissingOnboardingSchemaError(error)) {
    throw new Error(error.message)
  }

  revalidatePath('/onboarding')
  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard?welcome=1')
}
