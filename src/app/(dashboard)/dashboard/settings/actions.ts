/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceByIdCompatible, isMissingOnboardingSchemaError } from '@/lib/workspace-compat'
import { ensurePrimaryPipeline } from '@/lib/pipeline-defaults'
import { testMetaWhatsAppConnection } from '@/lib/whatsapp/meta-api'
import { normalizeTwilioWhatsAppAddress, validateTwilioProviderConfig } from '@/lib/whatsapp/providers'
import type { WhatsAppProviderName } from '@/lib/whatsapp/providers'

async function getAuthorizedWorkspaceId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!data
}

async function requireAuthorizedUser(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const ok = await getAuthorizedWorkspaceId(supabase, user.id, workspaceId)
  if (!ok) {
    return { supabase, error: 'Sem permissao para atualizar este workspace.' }
  }

  return { supabase, error: null }
}

export async function updateWorkspaceSettingsAction(workspaceId: string, formData: FormData) {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { error: authError }

  const businessName = (formData.get('business_name') as string)?.trim()
  const businessType = (formData.get('business_type') as string)?.trim()

  const workspaceResult = await getWorkspaceByIdCompatible(supabase, workspaceId)
  if (workspaceResult.error || !workspaceResult.workspace) {
    return { error: workspaceResult.error?.message ?? 'Workspace nao encontrado.' }
  }

  if (workspaceResult.usesLegacyOnboardingSchema) {
    const { error } = await (supabase as any)
      .from('workspaces')
      .update({ name: businessName || workspaceResult.workspace.name })
      .eq('id', workspaceId)

    if (error) return { error: error.message }
  } else {
    const { error } = await (supabase as any)
      .from('workspaces')
      .update({ business_name: businessName || null, business_type: businessType || null })
      .eq('id', workspaceId)

    if (error && isMissingOnboardingSchemaError(error)) {
      const { error: legacyError } = await (supabase as any)
        .from('workspaces')
        .update({ name: businessName || workspaceResult.workspace.name })
        .eq('id', workspaceId)

      if (legacyError) return { error: legacyError.message }
    } else if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function uploadLogoAction(workspaceId: string, formData: FormData) {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { error: authError }

  const workspaceResult = await getWorkspaceByIdCompatible(supabase, workspaceId)
  if (workspaceResult.error || !workspaceResult.workspace) {
    return { error: workspaceResult.error?.message ?? 'Workspace nao encontrado.' }
  }

  if (workspaceResult.usesLegacyOnboardingSchema) {
    return { error: 'Logo indisponivel enquanto a migration de onboarding nao for aplicada no banco.' }
  }

  const file = formData.get('logo') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Envie uma imagem de ate 2MB' }

  const ext = file.name.split('.').pop()
  const path = `workspaces/${workspaceId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from('logos').getPublicUrl(path)

  const logoUrl = `${publicUrl}?t=${Date.now()}`

  const { error } = await (supabase as any)
    .from('workspaces')
    .update({ logo_url: logoUrl })
    .eq('id', workspaceId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')
  return { success: true, logoUrl }
}

export async function updateSettingsPipelineStagesAction(
  workspaceId: string,
  stages: Array<{ id?: string; name: string; color: string; position: number }>
) {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { error: authError }

  const ensuredPipeline = await ensurePrimaryPipeline(supabase, workspaceId)
  if (ensuredPipeline.error || !ensuredPipeline.pipelineId) {
    return { error: ensuredPipeline.error ?? 'Nao foi possivel preparar o pipeline principal.' }
  }

  const { data: existing } = await (supabase as any)
    .from('pipeline_stages')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('pipeline_id', ensuredPipeline.pipelineId)

  const existingIds: string[] = (existing ?? []).map((stage: any) => stage.id as string)
  const incomingIds = new Set(stages.filter((stage) => stage.id).map((stage) => stage.id!))

  const toDelete = existingIds.filter((id) => !incomingIds.has(id))
  if (toDelete.length > 0) {
    const { error: deleteError } = await (supabase as any)
      .from('pipeline_stages')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('pipeline_id', ensuredPipeline.pipelineId)
      .in('id', toDelete)

    if (deleteError) return { error: deleteError.message }
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

      if (error) return { error: error.message }
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

      if (error) return { error: error.message }
    }
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateWhatsAppSettingsAction(
  workspaceId: string,
  data: {
    whatsapp_provider?: WhatsAppProviderName
    whatsapp_phone_number_id: string
    whatsapp_business_account_id?: string
    whatsapp_phone: string
    whatsapp_token?: string
    twilio_whatsapp_from?: string
    twilio_content_sid_new_lead?: string
  }
): Promise<{ error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { error: authError }

  const workspaceResult = await getWorkspaceByIdCompatible(supabase, workspaceId)
  if (workspaceResult.error || !workspaceResult.workspace) {
    return { error: workspaceResult.error?.message ?? 'Workspace nao encontrado.' }
  }

  if (workspaceResult.usesLegacyWhatsAppConfigSchema) {
    return {
      error: 'A configuracao nova do WhatsApp ainda nao existe no banco deste ambiente.',
    }
  }

  const provider = data.whatsapp_provider === 'twilio' ? 'twilio' : 'meta_cloud'
  const phoneNumberId = data.whatsapp_phone_number_id.trim()
  const businessAccountId = data.whatsapp_business_account_id?.trim() || null
  const whatsappPhone = data.whatsapp_phone.trim()
  const nextToken = data.whatsapp_token?.trim() || ''
  const twilioFrom = normalizeTwilioWhatsAppAddress(data.twilio_whatsapp_from)
  const twilioContentSid = data.twilio_content_sid_new_lead?.trim() || null

  if (provider === 'meta_cloud' && !phoneNumberId) {
    return { error: 'Informe o Phone Number ID do WhatsApp.' }
  }

  if (provider === 'meta_cloud' && !whatsappPhone) {
    return { error: 'Informe o numero do WhatsApp.' }
  }

  if (provider === 'twilio' && !twilioFrom) {
    return { error: 'Informe o sender Twilio no formato whatsapp:+55...' }
  }

  const { data: workspace } = await (supabase as any)
    .from('workspaces')
    .select('id, whatsapp_token')
    .eq('id', workspaceId)
    .maybeSingle() as {
      data: { id: string; whatsapp_token: string | null } | null
    }

  if (!workspace) {
    return { error: 'Workspace nao encontrado.' }
  }

  if (provider === 'meta_cloud' && !workspace.whatsapp_token && !nextToken) {
    return { error: 'Informe o token de acesso para concluir a configuracao do WhatsApp.' }
  }

  const updatePayload: Record<string, string | null> = {
    whatsapp_provider: provider,
    whatsapp_phone_number_id: phoneNumberId,
    whatsapp_business_account_id: businessAccountId,
    whatsapp_phone: whatsappPhone,
    twilio_whatsapp_from: twilioFrom || null,
    twilio_content_sid_new_lead: twilioContentSid,
  }

  if (nextToken) {
    updatePayload.whatsapp_token = nextToken
  }

  const { error } = await (supabase as any)
    .from('workspaces')
    .update(updatePayload)
    .eq('id', workspaceId)

  if (error) {
    return { error: 'Nao foi possivel salvar as configuracoes do WhatsApp.' }
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/onboarding')

  return { error: null }
}

export async function disconnectWhatsAppAction(
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { error: authError }

  const workspaceResult = await getWorkspaceByIdCompatible(supabase, workspaceId)
  if (workspaceResult.error || !workspaceResult.workspace) {
    return { error: workspaceResult.error?.message ?? 'Workspace nao encontrado.' }
  }

  if (workspaceResult.usesLegacyWhatsAppConfigSchema) {
    return {
      error: 'A configuracao nova do WhatsApp ainda nao existe no banco deste ambiente.',
    }
  }

  const { error } = await (supabase as any)
    .from('workspaces')
    .update({
      whatsapp_phone_number_id: null,
      whatsapp_business_account_id: null,
      whatsapp_phone: null,
      whatsapp_token: null,
      whatsapp_provider: 'meta_cloud',
      twilio_whatsapp_from: null,
      twilio_content_sid_new_lead: null,
    })
    .eq('id', workspaceId)

  if (error) {
    return { error: 'Nao foi possivel desconectar o WhatsApp.' }
  }

  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/inbox')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/onboarding')

  return { error: null }
}

export async function testWhatsAppConnectionAction(
  workspaceId: string
): Promise<{ success: boolean; error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedUser(workspaceId)
  if (authError) return { success: false, error: authError }

  const { workspace, error: workspaceError, usesLegacyWhatsAppConfigSchema } =
    await getWorkspaceByIdCompatible(supabase, workspaceId)

  if (workspaceError) {
    return { success: false, error: workspaceError.message }
  }

  if (usesLegacyWhatsAppConfigSchema) {
    return {
      success: false,
      error: 'A configuracao nova do WhatsApp ainda nao existe no banco deste ambiente.',
    }
  }

  if (!workspace) {
    return { success: false, error: 'Workspace nao encontrado.' }
  }

  if (workspace.whatsapp_provider === 'twilio') {
    const result = validateTwilioProviderConfig({
      id: workspace.id,
      whatsapp_provider: workspace.whatsapp_provider,
      whatsapp_phone_number_id: workspace.whatsapp_phone_number_id,
      whatsapp_business_account_id: workspace.whatsapp_business_account_id,
      whatsapp_phone: workspace.whatsapp_phone,
      whatsapp_token: workspace.whatsapp_token,
      twilio_whatsapp_from: workspace.twilio_whatsapp_from,
      twilio_content_sid_new_lead: workspace.twilio_content_sid_new_lead,
    })

    return {
      success: result.success,
      error: result.success ? null : result.error ?? 'Configuracao Twilio incompleta.',
    }
  }

  if (!workspace.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return {
      success: false,
      error: 'Preencha e salve o Phone Number ID e o token antes de testar a conexao.',
    }
  }

  return testMetaWhatsAppConnection(
    {
      phoneNumberId: workspace.whatsapp_phone_number_id,
      accessToken: workspace.whatsapp_token,
    }
  )
}
