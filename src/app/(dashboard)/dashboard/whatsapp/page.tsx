import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceIdForUser } from '@/lib/workspace-compat'
import { PageHeader } from '@/components/layout/page-header'
import { WhatsAppDashboard } from '@/components/whatsapp/whatsapp-dashboard'
import {
  getWhatsAppOverview,
  getMessagesPerDay,
  getAutomationStats,
  getTopContacts,
} from '@/lib/whatsapp/analytics'

export default async function WhatsAppAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { workspaceId } = await getWorkspaceIdForUser(supabase, user.id)
  if (!workspaceId) redirect('/login')

  const days = 30

  const [overview, messagesPerDay, automationStats, topContacts] = await Promise.all([
    getWhatsAppOverview(workspaceId, days),
    getMessagesPerDay(workspaceId, days),
    getAutomationStats(workspaceId, days),
    getTopContacts(workspaceId, days),
  ])

  return (
    <div>
      <PageHeader title="WhatsApp Analytics" description="Volume de mensagens, automacoes e conversas ativas" />
      <WhatsAppDashboard
        initialOverview={overview}
        initialMessagesPerDay={messagesPerDay}
        initialAutomationStats={automationStats}
        initialTopContacts={topContacts}
        workspaceId={workspaceId}
      />
    </div>
  )
}
