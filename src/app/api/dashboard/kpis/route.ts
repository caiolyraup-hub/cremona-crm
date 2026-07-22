import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWeekActivities, getWeeklyKPIs } from '@/lib/dashboard-queries'
import { getWeekStart, getWeekEnd } from '@/lib/weeks'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  const weekStartParam = searchParams.get('weekStart')

  if (!workspaceId || !weekStartParam) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const weekStart = getWeekStart(new Date(`${weekStartParam}T12:00:00`))
  const weekEnd = getWeekEnd(weekStart)

  const [kpis, activities] = await Promise.all([
    getWeeklyKPIs(workspaceId, weekStart),
    getWeekActivities(workspaceId, weekStart, weekEnd),
  ])

  return NextResponse.json({ kpis, activities })
}
