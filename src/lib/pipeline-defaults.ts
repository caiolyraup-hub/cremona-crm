/* eslint-disable @typescript-eslint/no-explicit-any */

type SupabaseLike = {
  from: (table: string) => any
}

export const DEFAULT_PIPELINE = {
  name: 'Principal',
  color: '#378ADD',
  position: 1,
}

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Novo lead', position: 1, color: '#94A3B8' },
  { name: 'Em contato', position: 2, color: '#60A5FA' },
  { name: 'Proposta enviada', position: 3, color: '#FBBF24' },
  { name: 'Negociacao', position: 4, color: '#F97316' },
  { name: 'Fechado', position: 5, color: '#22C55E' },
]

export async function linkOrphanStagesToPipeline(
  supabase: SupabaseLike,
  workspaceId: string,
  pipelineId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('pipeline_stages')
    .update({ pipeline_id: pipelineId })
    .eq('workspace_id', workspaceId)
    .is('pipeline_id', null)

  return { error: error?.message ?? null }
}

export async function ensurePrimaryPipeline(
  supabase: SupabaseLike,
  workspaceId: string
): Promise<{ pipelineId: string | null; error: string | null }> {
  const { data: existing, error: selectError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selectError) {
    return { pipelineId: null, error: selectError.message }
  }

  if (existing?.id) {
    const linked = await linkOrphanStagesToPipeline(supabase, workspaceId, existing.id)
    return { pipelineId: existing.id, error: linked.error }
  }

  const { data: created, error: insertError } = await supabase
    .from('pipelines')
    .insert({
      workspace_id: workspaceId,
      name: DEFAULT_PIPELINE.name,
      position: DEFAULT_PIPELINE.position,
      color: DEFAULT_PIPELINE.color,
    })
    .select('id')
    .single()

  if (insertError || !created?.id) {
    return {
      pipelineId: null,
      error: insertError?.message ?? 'Nao foi possivel criar o pipeline principal.',
    }
  }

  const linked = await linkOrphanStagesToPipeline(supabase, workspaceId, created.id)
  return { pipelineId: created.id, error: linked.error }
}
