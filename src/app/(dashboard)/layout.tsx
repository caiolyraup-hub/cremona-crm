import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTodayDateKey } from '@/lib/formatters'
import { getActiveWorkspace } from '@/lib/workspace'
import { getUnreadWhatsAppCount } from '@/lib/whatsapp/queries'
import { WorkspaceProvider } from '@/contexts/workspace-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const workspace = await getActiveWorkspace(user.id)
  if (!workspace) redirect('/login')
  if (!workspace.onboarding_completed) redirect('/onboarding')

  const userName = (user.user_metadata?.full_name as string | undefined) ?? ''
  const userEmail = user.email ?? ''

  const todayKey = getTodayDateKey()
  const { count: overdueCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .is('completed_at', null)
    .lt('due_date', todayKey)

  const unreadWhatsAppCount = await getUnreadWhatsAppCount(workspace.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: activeAutomationsCount } = await (supabase as any)
    .from('automations')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .eq('active', true)

  return (
    <WorkspaceProvider workspace={workspace}>
      <div className="flex h-screen overflow-hidden bg-white">
        <Sidebar
          overdueCount={overdueCount ?? 0}
          unreadWhatsAppCount={unreadWhatsAppCount}
          activeAutomationsCount={activeAutomationsCount ?? 0}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar userName={userName} userEmail={userEmail} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      <Toaster position="bottom-right" duration={3000} />
    </WorkspaceProvider>
  )
}
