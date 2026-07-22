'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAutomationsForEvent } from '@/lib/automations/engine'
import { ensurePrimaryPipeline } from '@/lib/pipeline-defaults'

export interface StageInput {
  id?: string
  name: string
  color: string
  position: number
}

export async function updateStagesAction(
  stages: StageInput[],
  workspaceId: string,
  pipelineId: string
): Promise<{ error: string | null }> {
  if (stages.length > 10) return { error: 'Máximo de 10 etapas permitidas' }

  const supabase = await createClient()
  let effectivePipelineId = pipelineId

  if (!effectivePipelineId) {
    const ensuredPipeline = await ensurePrimaryPipeline(supabase, workspaceId)
    if (ensuredPipeline.error || !ensuredPipeline.pipelineId) {
      return { error: ensuredPipeline.error ?? 'Nao foi possivel preparar o pipeline principal.' }
    }
    effectivePipelineId = ensuredPipeline.pipelineId
  }

  // 1. Fetch current stage ids for this pipeline
  const { data: currentRaw, error: currentError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('pipeline_id', effectivePipelineId)

  if (currentError) return { error: currentError.message }

  const currentIds = ((currentRaw ?? []) as { id: string }[]).map(s => s.id)
  const incomingIds = stages.filter(s => s.id).map(s => s.id as string)
  const toDelete = currentIds.filter(id => !incomingIds.includes(id))

  // 2. For each deleted stage: move contacts to null first, then delete
  for (const stageId of toDelete) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: contactsError } = await (supabase as any)
      .from('contacts')
      .update({ pipeline_stage_id: null, updated_at: new Date().toISOString() })
      .eq('pipeline_stage_id', stageId)
      .eq('workspace_id', workspaceId)

    if (contactsError) return { error: contactsError.message }

    const { error: deleteError } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', stageId)
      .eq('workspace_id', workspaceId)

    if (deleteError) return { error: deleteError.message }
  }

  // 3. Update existing stages and insert new ones sequentially
  for (const stage of stages) {
    if (stage.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('pipeline_stages')
        .update({
          name: stage.name,
          color: stage.color,
          position: stage.position,
          pipeline_id: effectivePipelineId,
        })
        .eq('id', stage.id)
        .eq('workspace_id', workspaceId)

      if (error) return { error: error.message }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('pipeline_stages').insert({
        workspace_id: workspaceId,
        pipeline_id: effectivePipelineId,
        name: stage.name,
        color: stage.color,
        position: stage.position,
      })

      if (error) return { error: error.message }
    }
  }

  revalidatePath('/dashboard/pipeline')
  return { error: null }
}

export async function moveContactStageAction(
  contactId: string,
  newStageId: string | null,
  workspaceId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // 1. Fetch contact — verify ownership and get current stage
  const { data: contactsRaw } = await supabase
    .from('contacts')
    .select('id, pipeline_stage_id')
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .limit(1)

  const contacts = (contactsRaw ?? []) as { id: string; pipeline_stage_id: string | null }[]
  if (contacts.length === 0) return { error: 'Contato não encontrado' }

  const previousStageId = contacts[0].pipeline_stage_id
  if (previousStageId === newStageId) return { error: null }

  // 2. Fetch stage names for the activity log
  let oldStageName: string | null = null
  let newStageName: string | null = null

  if (previousStageId) {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', previousStageId)
      .eq('workspace_id', workspaceId)
      .limit(1)
    oldStageName = ((data ?? []) as { name: string }[])[0]?.name ?? null
  }

  if (newStageId) {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', newStageId)
      .eq('workspace_id', workspaceId)
      .limit(1)
    const stageRows = ((data ?? []) as { name: string }[])
    if (stageRows.length === 0) return { error: 'Estágio não encontrado' }
    newStageName = stageRows[0].name
  }

  // 3. Build activity message
  let activityContent: string
  if (newStageId === null) {
    activityContent = 'Removido do pipeline'
  } else if (oldStageName) {
    activityContent = `Movido de ${oldStageName} para ${newStageName}`
  } else {
    activityContent = `Adicionado à etapa ${newStageName}`
  }

  // 4. Update contact's pipeline stage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('contacts')
    .update({
      pipeline_stage_id: newStageId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)

  if (updateError) return { error: 'Erro ao mover contato' }

  // 5. Log activity — fire and forget (no revalidatePath — UI is optimistic)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    type: 'stage_change',
    content: activityContent,
  })

  // 6. Registrar eventos de automacao de forma duravel antes de concluir.
  try {
    if (previousStageId) {
      await runAutomationsForEvent({
        type: 'stage_exit',
        workspaceId,
        contactId,
        stageId: previousStageId,
      })
    }
    if (newStageId) {
      await runAutomationsForEvent({
        type: 'stage_enter',
        workspaceId,
        contactId,
        stageId: newStageId,
      })
    }
  } catch (automationError) {
    console.error('[pipeline] contato movido, mas automacoes nao foram enfileiradas.', {
      workspace_id: workspaceId,
      contact_id: contactId,
      previous_stage_id: previousStageId,
      new_stage_id: newStageId,
      error: automationError instanceof Error ? automationError.message : String(automationError),
    })
    return { error: 'Contato movido, mas nao foi possivel registrar as automacoes. Tente novamente.' }
  }

  return { error: null }
}

export async function reorderStagesAction(
  stages: { id: string; position: number }[],
  workspaceId: string
): Promise<{ error: string | null }> {
  if (stages.length === 0) return { error: null }

  const supabase = await createClient()

  // Validate all stage ids belong to the workspace
  const { data: existingRaw } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .in('id', stages.map(s => s.id))

  const existing = ((existingRaw ?? []) as { id: string }[])
  if (existing.length !== stages.length) {
    return { error: 'Uma ou mais etapas não foram encontradas' }
  }

  // Update positions in parallel
  await Promise.all(
    stages.map(s =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('pipeline_stages')
        .update({ position: s.position })
        .eq('id', s.id)
        .eq('workspace_id', workspaceId)
    )
  )

  return { error: null }
}
