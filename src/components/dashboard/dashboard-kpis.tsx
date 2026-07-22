import { TrendingUp, ListTodo } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/formatters'
import { getDateRange } from '@/lib/sales'

interface DashboardKpisProps {
  workspaceId: string
}

export async function DashboardKpis({ workspaceId }: DashboardKpisProps) {
  const supabase = await createClient()
  const weekRange = getDateRange('this_week')
  const weekStart = weekRange.start.toISOString().slice(0, 10)
  const weekEnd = weekRange.end.toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [weekSalesRes, pendingTasksRes] = await Promise.all([
    sb
      .from('sales')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('sale_date', weekStart)
      .lte('sale_date', weekEnd),
    sb
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('completed_at', null),
  ])

  const weekRevenue = ((weekSalesRes.data ?? []) as Array<{ value: number }>).reduce(
    (sum, item) => sum + Number(item.value ?? 0),
    0
  )
  const pendingTaskCount: number = (pendingTasksRes as { count: number | null }).count ?? 0

  return (
    <div className="mb-6 grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" />
          <p className="text-sm font-medium text-gray-600">Receita esta semana</p>
        </div>
        <p className="mt-3 text-2xl font-semibold text-green-600">{formatCurrency(weekRevenue)}</p>
        <p className="mt-1 text-xs text-gray-400">Vendas pagas desde segunda-feira</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ListTodo size={16} className="text-amber-600" />
          <p className="text-sm font-medium text-gray-600">Tarefas pendentes</p>
        </div>
        <p className="mt-3 text-2xl font-semibold text-[#1a2b4a]">{pendingTaskCount}</p>
        <p className="mt-1 text-xs text-gray-400">
          {pendingTaskCount === 0
            ? 'Tudo em dia'
            : `${pendingTaskCount} tarefa${pendingTaskCount === 1 ? '' : 's'} em aberto`}
        </p>
      </div>
    </div>
  )
}

export function DashboardKpisSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4">
      {[0, 1].map(i => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
          <div className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  )
}
