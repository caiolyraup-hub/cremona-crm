/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/server'

export interface WhatsAppOverview {
  totalSent: number
  totalReceived: number
  totalConversations: number
  activeConversations: number
  responseRate: number
  avgResponseTimeMinutes: number | null
}

export interface MessagesByDay {
  date: string
  sent: number
  received: number
}

export interface AutomationTopItem {
  id: string
  name: string
  executions: number
  successRate: number
}

export interface AutomationStats {
  totalExecutions: number
  successRate: number
  topAutomations: AutomationTopItem[]
}

export interface TopContact {
  contact_id: string
  contact_name: string
  message_count: number
  last_message_at: string
}

export async function getWhatsAppOverview(
  workspaceId: string,
  days: number = 30
): Promise<WhatsAppOverview> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [sentRes, receivedRes, convsRes, activeRes] = await Promise.all([
    (supabase as any)
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outbound')
      .gte('created_at', since),
    (supabase as any)
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .gte('created_at', since),
    (supabase as any)
      .from('messages')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since),
    (supabase as any)
      .from('messages')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since7d),
  ])

  const totalSent: number = sentRes.count ?? 0
  const totalReceived: number = receivedRes.count ?? 0

  const allContacts = (convsRes.data ?? []) as Array<{ contact_id: string }>
  const totalConversations = new Set(allContacts.map(r => r.contact_id)).size

  const activeContacts = (activeRes.data ?? []) as Array<{ contact_id: string }>
  const activeConversations = new Set(activeContacts.map(r => r.contact_id)).size

  // Response rate: % of inbound contacts that also have an outbound in the period
  const [inboundContactsRes, respondedRes] = await Promise.all([
    (supabase as any)
      .from('messages')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'inbound')
      .gte('created_at', since),
    (supabase as any)
      .from('messages')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('direction', 'outbound')
      .gte('created_at', since),
  ])

  const inboundSet = new Set(
    ((inboundContactsRes.data ?? []) as Array<{ contact_id: string }>).map(r => r.contact_id)
  )
  const outboundSet = new Set(
    ((respondedRes.data ?? []) as Array<{ contact_id: string }>).map(r => r.contact_id)
  )
  const respondedCount = Array.from(inboundSet).filter(id => outboundSet.has(id)).length
  const responseRate = inboundSet.size === 0
    ? 0
    : Math.round((respondedCount / inboundSet.size) * 1000) / 10

  return {
    totalSent,
    totalReceived,
    totalConversations,
    activeConversations,
    responseRate,
    avgResponseTimeMinutes: null,
  }
}

export async function getMessagesPerDay(
  workspaceId: string,
  days: number = 30
): Promise<MessagesByDay[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await (supabase as any)
    .from('messages')
    .select('direction, created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  const rows = (data ?? []) as Array<{ direction: string; created_at: string }>

  // Group by date in local time
  const byDate: Record<string, { sent: number; received: number }> = {}
  for (const row of rows) {
    const date = row.created_at.slice(0, 10) // YYYY-MM-DD
    if (!byDate[date]) byDate[date] = { sent: 0, received: 0 }
    if (row.direction === 'outbound') byDate[date].sent++
    else byDate[date].received++
  }

  // Fill missing days with zeros
  const result: MessagesByDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const date = d.toISOString().slice(0, 10)
    result.push({ date, sent: byDate[date]?.sent ?? 0, received: byDate[date]?.received ?? 0 })
  }

  return result
}

export async function getAutomationStats(
  workspaceId: string,
  days: number = 30
): Promise<AutomationStats> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [automationsRes, logsRes] = await Promise.all([
    (supabase as any)
      .from('automations')
      .select('id, name')
      .eq('workspace_id', workspaceId),
    (supabase as any)
      .from('automation_logs')
      .select('automation_id, status')
      .eq('workspace_id', workspaceId)
      .gte('executed_at', since),
  ])

  const automations = (automationsRes.data ?? []) as Array<{ id: string; name: string }>
  const logs = (logsRes.data ?? []) as Array<{ automation_id: string; status: string }>

  const countByAutomation: Record<string, { total: number; successes: number }> = {}
  for (const log of logs) {
    if (!countByAutomation[log.automation_id]) {
      countByAutomation[log.automation_id] = { total: 0, successes: 0 }
    }
    countByAutomation[log.automation_id].total++
    if (log.status === 'success') countByAutomation[log.automation_id].successes++
  }

  const topAutomations: AutomationTopItem[] = automations
    .map(a => {
      const stats = countByAutomation[a.id] ?? { total: 0, successes: 0 }
      return {
        id: a.id,
        name: a.name,
        executions: stats.total,
        successRate: stats.total === 0 ? 0 : Math.round((stats.successes / stats.total) * 100),
      }
    })
    .filter(a => a.executions > 0)
    .sort((a, b) => b.executions - a.executions)
    .slice(0, 5)

  const totalExecutions = logs.length
  const totalSuccesses = logs.filter(l => l.status === 'success').length
  const successRate = totalExecutions === 0 ? 0 : Math.round((totalSuccesses / totalExecutions) * 100)

  return { totalExecutions, successRate, topAutomations }
}

export async function getTopContacts(
  workspaceId: string,
  days: number = 30
): Promise<TopContact[]> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [messagesRes, contactsRes] = await Promise.all([
    (supabase as any)
      .from('messages')
      .select('contact_id, created_at')
      .eq('workspace_id', workspaceId)
      .gte('created_at', since),
    (supabase as any)
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null),
  ])

  const messages = (messagesRes.data ?? []) as Array<{ contact_id: string; created_at: string }>
  const contacts = (contactsRes.data ?? []) as Array<{ id: string; name: string }>
  const contactMap = new Map(contacts.map(c => [c.id, c.name]))

  const byContact: Record<string, { count: number; last: string }> = {}
  for (const m of messages) {
    if (!m.contact_id) continue
    if (!byContact[m.contact_id]) byContact[m.contact_id] = { count: 0, last: m.created_at }
    byContact[m.contact_id].count++
    if (m.created_at > byContact[m.contact_id].last) byContact[m.contact_id].last = m.created_at
  }

  return Object.entries(byContact)
    .map(([contact_id, { count, last }]) => ({
      contact_id,
      contact_name: contactMap.get(contact_id) ?? 'Desconhecido',
      message_count: count,
      last_message_at: last,
    }))
    .sort((a, b) => b.message_count - a.message_count)
    .slice(0, 5)
}
