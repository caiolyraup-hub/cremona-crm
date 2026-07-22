'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPipelineAction(
  workspaceId: string,
  name: string,
  color: string
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('pipelines')
    .select('position')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = ((existing ?? []) as { position: number }[])[0]?.position ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('pipelines')
    .insert({ workspace_id: workspaceId, name, color, position: nextPosition + 1 })
    .select('id')
    .single()

  if (error) return { id: null, error: 'Erro ao criar pipeline' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('pipeline_stages').insert({
    workspace_id: workspaceId,
    pipeline_id: (data as { id: string }).id,
    name: 'Novo Lead',
    color: '#378ADD',
    position: 1,
  })

  revalidatePath('/dashboard/pipeline')
  return { id: (data as { id: string }).id, error: null }
}

export async function updatePipelineAction(
  pipelineId: string,
  workspaceId: string,
  updates: { name?: string; color?: string }
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('pipelines')
    .update(updates)
    .eq('id', pipelineId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar pipeline' }

  revalidatePath('/dashboard/pipeline')
  return { error: null }
}

export async function deletePipelineAction(
  pipelineId: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: pipelines } = await supabase
    .from('pipelines')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (((pipelines ?? []) as { id: string }[]).length <= 1) {
    return { error: 'Não é possível excluir o único pipeline' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('pipelines')
    .delete()
    .eq('id', pipelineId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir pipeline' }

  revalidatePath('/dashboard/pipeline')
  return { error: null }
}
