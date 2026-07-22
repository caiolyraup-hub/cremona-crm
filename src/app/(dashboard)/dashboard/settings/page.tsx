/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceByIdCompatible, getWorkspaceIdForUser } from '@/lib/workspace-compat'
import { ensurePrimaryPipeline } from '@/lib/pipeline-defaults'
import { getWhatsAppEnvStatus } from '@/lib/whatsapp/env'
import { PageHeader } from '@/components/layout/page-header'
import { WorkspaceSettings } from '@/components/settings/workspace-settings'
import { PipelineSettings } from '@/components/settings/pipeline-settings'
import { PlanSettings } from '@/components/settings/plan-settings'
import { WhatsappSettings } from '@/components/settings/whatsapp-settings'
import { TemplatesSettings } from '@/components/settings/templates-settings'
import { SettingsTabs } from '@/components/settings/settings-tabs'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { workspaceId, error: memberError } = await getWorkspaceIdForUser(supabase, user.id)
  if (memberError) throw new Error(memberError.message)
  if (!workspaceId) redirect('/login')

  const { workspace, error: workspaceError } = await getWorkspaceByIdCompatible(
    supabase,
    workspaceId
  )
  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) redirect('/login')

  const ensuredPipeline = await ensurePrimaryPipeline(supabase, workspace.id)
  if (ensuredPipeline.error || !ensuredPipeline.pipelineId) {
    throw new Error(ensuredPipeline.error ?? 'Nao foi possivel preparar o pipeline principal.')
  }

  const { data: stages } = await (supabase as any)
    .from('pipeline_stages')
    .select('id, name, color, position')
    .eq('workspace_id', workspace.id)
    .eq('pipeline_id', ensuredPipeline.pipelineId)
    .order('position', { ascending: true }) as {
    data: Array<{ id: string; name: string; color: string; position: number }> | null
  }

  const tab = searchParams.tab ?? 'workspace'
  const whatsAppEnvStatus = getWhatsAppEnvStatus()
  const suggestedWebhookUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    ? `${process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '')}/api/whatsapp/webhook`
    : 'https://seu-dominio.vercel.app/api/whatsapp/webhook'

  return (
    <div>
      <PageHeader title="Configuracoes" description="Ajustes do workspace" />

      <SettingsTabs activeTab={tab}>
        {{
          workspace: <WorkspaceSettings workspace={workspace} />,
          pipeline: <PipelineSettings workspaceId={workspace.id} stages={stages ?? []} />,
          plan: <PlanSettings workspace={workspace} />,
          whatsapp: (
            <WhatsappSettings
              workspace={{
                id: workspace.id,
                whatsapp_provider: workspace.whatsapp_provider,
                whatsapp_phone_number_id: workspace.whatsapp_phone_number_id,
                whatsapp_business_account_id: workspace.whatsapp_business_account_id,
                whatsapp_phone: workspace.whatsapp_phone,
                twilio_whatsapp_from: workspace.twilio_whatsapp_from,
                twilio_content_sid_new_lead: workspace.twilio_content_sid_new_lead,
                has_whatsapp_token: Boolean(workspace.whatsapp_token),
              }}
              diagnostics={{
                hasVerifyToken: whatsAppEnvStatus.hasVerifyToken,
                hasAppSecret: whatsAppEnvStatus.hasAppSecret,
                warnings: whatsAppEnvStatus.warnings,
                suggestedWebhookUrl,
              }}
            />
          ),
          templates: <TemplatesSettings workspaceId={workspace.id} />,
        }}
      </SettingsTabs>
    </div>
  )
}
