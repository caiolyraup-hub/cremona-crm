import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkspaceIdForUser } from '@/lib/workspace-compat'
import {
  getWhatsAppOverview,
  getMessagesPerDay,
  getAutomationStats,
  getTopContacts,
} from '@/lib/whatsapp/analytics'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  const days = Math.min(Math.max(Number(searchParams.get('days') ?? '30'), 1), 90)

  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const { workspaceId: memberWorkspaceId } = await getWorkspaceIdForUser(supabase, user.id)
  if (memberWorkspaceId !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [overview, messagesPerDay, automationStats, topContacts] = await Promise.all([
    getWhatsAppOverview(workspaceId, days),
    getMessagesPerDay(workspaceId, days),
    getAutomationStats(workspaceId, days),
    getTopContacts(workspaceId, days),
  ])

  return NextResponse.json({ overview, messagesPerDay, automationStats, topContacts })
}
