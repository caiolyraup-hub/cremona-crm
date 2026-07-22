import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics'
import { WelcomeToast } from '@/components/dashboard/welcome-toast'
import { CheckoutSuccessToast } from '@/components/dashboard/checkout-success-toast'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { welcome?: string; checkout?: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) redirect('/login')
  const workspaceId = (members[0] as Tables<'workspace_members'>).workspace_id

  return (
    <>
      {searchParams.welcome === '1' && <WelcomeToast />}
      {searchParams.checkout === 'success' && <CheckoutSuccessToast />}
      <DashboardMetrics workspaceId={workspaceId} />
    </>
  )
}
