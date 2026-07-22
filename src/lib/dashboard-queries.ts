/* eslint-disable @typescript-eslint/no-explicit-any */
import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { getLast12Weeks, getPreviousWeek, getWeekLabel, getWeekStart } from '@/lib/weeks'
import type { WeeklyKPIs, WeeklyChartData, FunnelStage, DashboardActivity } from '@/types/app'

function devLog(label: string, ms: number) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[dashboard] ${label}: ${ms.toFixed(0)}ms`)
  }
}

async function timedQuery<T>(label: string, query: Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await query
  devLog(label, performance.now() - start)
  return result
}

async function getClosedStageName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
): Promise<string> {
  const closedStageRes = await timedQuery<any>(
    'getWeeklyKPIs.closedStage',
    (supabase as any)
      .from('pipeline_stages')
      .select('name')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: false })
      .limit(1)
  )

  return ((closedStageRes.data ?? []) as Array<{ name: string }>)[0]?.name ?? 'Fechado'
}

export async function getWeeklyKPIs(
  workspaceId: string,
  weekStart: Date
): Promise<WeeklyKPIs> {
  const supabase = await createClient()
  const weekEndExclusive = addDays(weekStart, 7)
  const weekStartKey = format(weekStart, 'yyyy-MM-dd')
  const weekEndKey = format(addDays(weekEndExclusive, -1), 'yyyy-MM-dd')
  const weekStartIso = weekStart.toISOString()
  const weekEndIso = weekEndExclusive.toISOString()

  const prevWeekStart = getPreviousWeek(weekStart)
  const prevWeekStartKey = format(prevWeekStart, 'yyyy-MM-dd')
  const prevWeekEndKey = format(addDays(weekStart, -1), 'yyyy-MM-dd')
  const prevWeekStartIso = prevWeekStart.toISOString()
  const prevWeekEndIso = weekStartIso
  const closedStageName = await getClosedStageName(supabase, workspaceId)

  const responses = (await Promise.all([
    timedQuery(
      'getWeeklyKPIs.revenue.current',
      (supabase as any)
        .from('sales')
        .select('value')
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .gte('sale_date', weekStartKey)
        .lte('sale_date', weekEndKey)
    ),
    timedQuery(
      'getWeeklyKPIs.revenue.previous',
      (supabase as any)
        .from('sales')
        .select('value')
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .gte('sale_date', prevWeekStartKey)
        .lte('sale_date', prevWeekEndKey)
    ),
    timedQuery(
      'getWeeklyKPIs.leads.current',
      (supabase as any)
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .gte('created_at', weekStartIso)
        .lt('created_at', weekEndIso)
    ),
    timedQuery(
      'getWeeklyKPIs.leads.previous',
      (supabase as any)
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .gte('created_at', prevWeekStartIso)
        .lt('created_at', prevWeekEndIso)
    ),
    timedQuery(
      'getWeeklyKPIs.conversions.current',
      (supabase as any)
        .from('activities')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('type', 'stage_change')
        .ilike('content', `%${closedStageName}%`)
        .gte('created_at', weekStartIso)
        .lt('created_at', weekEndIso)
    ),
    timedQuery(
      'getWeeklyKPIs.conversions.previous',
      (supabase as any)
        .from('activities')
        .select('contact_id')
        .eq('workspace_id', workspaceId)
        .eq('type', 'stage_change')
        .ilike('content', `%${closedStageName}%`)
        .gte('created_at', prevWeekStartIso)
        .lt('created_at', prevWeekEndIso)
    ),
    timedQuery(
      'getWeeklyKPIs.tasks.current',
      (supabase as any)
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('completed_at', weekStartIso)
        .lt('completed_at', weekEndIso)
    ),
    timedQuery(
      'getWeeklyKPIs.tasks.previous',
      (supabase as any)
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('completed_at', prevWeekStartIso)
        .lt('completed_at', prevWeekEndIso)
    ),
  ])) as any[]

  const [
    revenueRes,
    revenuePrevRes,
    leadsRes,
    leadsPrevRes,
    convRes,
    convPrevRes,
    tasksRes,
    tasksPrevRes,
  ] = responses

  const revenue = (revenueRes.data ?? []).reduce(
    (sum: number, sale: { value: number }) => sum + Number(sale.value ?? 0),
    0
  )
  const revenuePrev = (revenuePrevRes.data ?? []).reduce(
    (sum: number, sale: { value: number }) => sum + Number(sale.value ?? 0),
    0
  )
  const newLeads = leadsRes.count ?? 0
  const newLeadsPrev = leadsPrevRes.count ?? 0

  const conversionIds = new Set<string>(
    (convRes.data ?? [])
      .map((activity: { contact_id: string | null }) => activity.contact_id)
      .filter(Boolean)
  )
  const conversionPrevIds = new Set<string>(
    (convPrevRes.data ?? [])
      .map((activity: { contact_id: string | null }) => activity.contact_id)
      .filter(Boolean)
  )

  const conversions = conversionIds.size

  return {
    revenue,
    revenuePrev,
    newLeads,
    newLeadsPrev,
    conversions,
    conversionsPrev: conversionPrevIds.size,
    conversionRate: newLeads > 0 ? (conversions / newLeads) * 100 : 0,
    tasksCompleted: tasksRes.count ?? 0,
    tasksCompletedPrev: tasksPrevRes.count ?? 0,
  }
}

export async function getLast12WeeksData(workspaceId: string): Promise<WeeklyChartData[]> {
  const supabase = await createClient()
  const weeks = getLast12Weeks()
  const firstWeekStart = weeks[0]
  const firstWeekStartKey = format(firstWeekStart, 'yyyy-MM-dd')
  const firstWeekStartIso = firstWeekStart.toISOString()

  const [contactsRes, salesRes] = (await Promise.all([
    timedQuery(
      'getLast12WeeksData.contacts',
      (supabase as any)
        .from('contacts')
        .select('created_at')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .gte('created_at', firstWeekStartIso)
    ),
    timedQuery(
      'getLast12WeeksData.sales',
      (supabase as any)
        .from('sales')
        .select('value, sale_date')
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .gte('sale_date', firstWeekStartKey)
    ),
  ])) as any[]

  const contacts: Array<{ created_at: string }> = contactsRes.data ?? []
  const sales: Array<{ value: number; sale_date: string }> = salesRes.data ?? []
  const weeksMap = new Map<string, WeeklyChartData>()

  for (const weekStart of weeks) {
    const weekKey = format(weekStart, 'yyyy-MM-dd')
    weeksMap.set(weekKey, {
      weekStart: weekKey,
      weekLabel: format(weekStart, 'dd/MM', { locale: ptBR }),
      weekRangeLabel: getWeekLabel(weekStart),
      revenue: 0,
      leads: 0,
      conversions: 0,
    })
  }

  for (const contact of contacts) {
    const weekKey = format(getWeekStart(new Date(contact.created_at)), 'yyyy-MM-dd')
    const bucket = weeksMap.get(weekKey)
    if (bucket) bucket.leads += 1
  }

  for (const sale of sales) {
    const weekKey = format(getWeekStart(new Date(`${sale.sale_date}T12:00:00`)), 'yyyy-MM-dd')
    const bucket = weeksMap.get(weekKey)
    if (bucket) bucket.revenue += Number(sale.value ?? 0)
  }

  return weeks.map(weekStart => weeksMap.get(format(weekStart, 'yyyy-MM-dd'))!)
}

export async function getFunnelData(workspaceId: string): Promise<FunnelStage[]> {
  const supabase = await createClient()

  const [stagesRes, contactsRes] = (await Promise.all([
    timedQuery(
      'getFunnelData.stages',
      (supabase as any)
        .from('pipeline_stages')
        .select('id, name, color, position')
        .eq('workspace_id', workspaceId)
        .order('position', { ascending: true })
    ),
    timedQuery(
      'getFunnelData.contacts',
      (supabase as any)
        .from('contacts')
        .select('pipeline_stage_id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .not('pipeline_stage_id', 'is', null)
    ),
  ])) as any[]

  const stages: Array<{ id: string; name: string; color: string; position: number }> =
    stagesRes.data ?? []
  const contacts: Array<{ pipeline_stage_id: string }> = contactsRes.data ?? []

  const countByStage = new Map<string, number>()
  for (const contact of contacts) {
    countByStage.set(contact.pipeline_stage_id, (countByStage.get(contact.pipeline_stage_id) ?? 0) + 1)
  }

  return stages.map((stage, index) => {
    const count = countByStage.get(stage.id) ?? 0
    const prevCount = index > 0 ? (countByStage.get(stages[index - 1].id) ?? 0) : 0
    const conversionRate = index === 0 || prevCount === 0 ? 0 : (count / prevCount) * 100

    return {
      stageId: stage.id,
      stageName: stage.name,
      stageColor: stage.color,
      position: stage.position,
      count,
      conversionRate,
    }
  })
}

export async function getWeekActivities(
  workspaceId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<DashboardActivity[]> {
  const supabase = await createClient()
  const activitiesRes = await timedQuery<any>(
    'getWeekActivities.activities',
    (supabase as any)
      .from('activities')
      .select('*, contact:contacts(id, name)')
      .eq('workspace_id', workspaceId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(15)
  )

  return (activitiesRes.data ?? []) as DashboardActivity[]
}
