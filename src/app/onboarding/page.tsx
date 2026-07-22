/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from '@/app/onboarding/onboarding-flow'
import { getWorkspaceByIdCompatible, getWorkspaceIdForUser } from '@/lib/workspace-compat'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { workspaceId, error: memberError } = await getWorkspaceIdForUser(supabase, user.id)
  if (memberError) throw new Error(memberError.message)
  if (!workspaceId) redirect('/login')

  const { workspace, error: workspaceError, usesLegacyOnboardingSchema } =
    await getWorkspaceByIdCompatible(supabase, workspaceId)
  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) redirect('/login')
  if (usesLegacyOnboardingSchema || workspace.onboarding_completed) redirect('/dashboard')

  const { data: stages } = await (supabase as any)
    .from('pipeline_stages')
    .select('id, name, color, position')
    .eq('workspace_id', workspace.id)
    .order('position', { ascending: true }) as {
    data: Array<{ id: string; name: string; color: string; position: number }> | null
  }

  const { count: contactsCount } = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)

  return (
    <OnboardingFlow
      workspace={{
        id: workspace.id,
        name: workspace.name,
        business_name: workspace.business_name,
        business_type: workspace.business_type,
        logo_url: workspace.logo_url,
        whatsapp_provider: workspace.whatsapp_provider,
        whatsapp_phone_number_id: workspace.whatsapp_phone_number_id,
        whatsapp_business_account_id: workspace.whatsapp_business_account_id,
        whatsapp_phone: workspace.whatsapp_phone,
        twilio_whatsapp_from: workspace.twilio_whatsapp_from,
        has_whatsapp_token: Boolean(workspace.whatsapp_token),
      }}
      initialStages={stages ?? []}
      initialContactsCount={contactsCount ?? 0}
    />
  )
}
