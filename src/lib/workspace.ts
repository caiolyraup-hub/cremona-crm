import { createClient } from './supabase/server'
import type { Tables } from '@/types/database'
import type { WorkspaceWithStages } from '@/types/app'
import { getWorkspaceByIdCompatible, getWorkspaceIdForUser } from './workspace-compat'
import { ensurePrimaryPipeline } from './pipeline-defaults'

export async function getActiveWorkspace(userId: string): Promise<WorkspaceWithStages | null> {
  const supabase = await createClient()

  const { workspaceId, error: memberError } = await getWorkspaceIdForUser(supabase, userId)
  if (memberError) {
    throw new Error(`Erro ao buscar workspace do usuario: ${memberError.message}`)
  }

  if (!workspaceId) {
    return null
  }

  const { workspace, error: workspaceError } = await getWorkspaceByIdCompatible(
    supabase,
    workspaceId
  )
  if (workspaceError) {
    throw new Error(`Workspace nao encontrado: ${workspaceError.message}`)
  }

  if (!workspace) {
    return null
  }

  const ensuredPipeline = await ensurePrimaryPipeline(supabase, workspaceId)
  if (ensuredPipeline.error) {
    throw new Error(`Erro ao preparar pipeline principal: ${ensuredPipeline.error}`)
  }

  const [stagesResult, pipelinesResult] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true }),
    supabase
      .from('pipelines')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: true }),
  ])

  if (stagesResult.error) {
    throw new Error(`Erro ao buscar pipeline stages: ${stagesResult.error.message}`)
  }
  if (pipelinesResult.error) {
    throw new Error(`Erro ao buscar pipelines: ${pipelinesResult.error.message}`)
  }

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    owner_id: workspace.owner_id,
    whatsapp_phone: workspace.whatsapp_phone,
    whatsapp_phone_number_id: workspace.whatsapp_phone_number_id,
    whatsapp_business_account_id: workspace.whatsapp_business_account_id,
    plan: workspace.plan,
    trial_ends_at: workspace.trial_ends_at,
    created_at: workspace.created_at,
    onboarding_completed: workspace.onboarding_completed,
    business_name: workspace.business_name,
    business_type: workspace.business_type,
    logo_url: workspace.logo_url,
    stripe_customer_id: workspace.stripe_customer_id,
    stripe_subscription_id: workspace.stripe_subscription_id,
    stripe_price_id: workspace.stripe_price_id,
    subscription_status: workspace.subscription_status,
    subscription_ends_at: workspace.subscription_ends_at,
    has_whatsapp_token: Boolean(workspace.whatsapp_token),
    pipeline_stages: (stagesResult.data ?? []) as Tables<'pipeline_stages'>[],
    pipelines: (pipelinesResult.data ?? []) as Tables<'pipelines'>[],
  }
}
