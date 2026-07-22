import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatRelativeDate } from '@/lib/formatters'
import {
  getCurrentMonthRange,
  getDateRange,
  getPreviousMonthRange,
  getPreviousWeekRange,
} from '@/lib/sales'
import { createClient } from '@/lib/supabase/server'

interface SalesWidgetProps {
  workspaceId: string
}

type LatestSale = {
  id: string
  product_name: string
  value: number
  sale_date: string
  contact: { name: string } | null
}

function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  if (previous === 0 && current > 0) {
    return <span className="text-xs font-medium text-blue-600">Novo</span>
  }

  const pct = ((current - previous) / previous) * 100
  const abs = Math.abs(pct).toFixed(1)

  if (pct > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-green-600">
        <TrendingUp size={11} />
        {abs}%
      </span>
    )
  }
  if (pct < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
        <TrendingDown size={11} />
        {abs}%
      </span>
    )
  }
  return <span className="text-xs text-gray-400">= igual</span>
}

export async function SalesWidget({ workspaceId }: SalesWidgetProps) {
  const supabase = await createClient()
  const weekRange = getDateRange('this_week')
  const prevWeekRange = getPreviousWeekRange()
  const monthRange = getCurrentMonthRange()
  const previousMonthRange = getPreviousMonthRange()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const toKey = (d: Date) => d.toISOString().slice(0, 10)

  const [weekRes, prevWeekRes, monthRes, previousMonthRes, latestRes] = await Promise.all([
    sb
      .from('sales')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('sale_date', toKey(weekRange.start))
      .lte('sale_date', toKey(weekRange.end)),
    sb
      .from('sales')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('sale_date', toKey(prevWeekRange.start))
      .lte('sale_date', toKey(prevWeekRange.end)),
    sb
      .from('sales')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('sale_date', toKey(monthRange.start))
      .lte('sale_date', toKey(monthRange.end)),
    sb
      .from('sales')
      .select('value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .gte('sale_date', toKey(previousMonthRange.start))
      .lte('sale_date', toKey(previousMonthRange.end)),
    sb
      .from('sales')
      .select('id, product_name, value, sale_date, contact:contacts(name)')
      .eq('workspace_id', workspaceId)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const sum = (rows: Array<{ value: number }>) =>
    rows.reduce((s, r) => s + Number(r.value ?? 0), 0)

  const weekTotal = sum((weekRes.data ?? []) as Array<{ value: number }>)
  const prevWeekTotal = sum((prevWeekRes.data ?? []) as Array<{ value: number }>)
  const monthTotal = sum((monthRes.data ?? []) as Array<{ value: number }>)
  const previousMonthTotal = sum((previousMonthRes.data ?? []) as Array<{ value: number }>)
  const latestSales = (latestRes.data ?? []) as LatestSale[]

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-green-600" />
          <h2 className="text-sm font-semibold text-gray-800">Vendas</h2>
        </div>
        <Link href="/dashboard/sales" className="text-xs text-[#378ADD] hover:underline">
          Ver relatorio
        </Link>
      </div>

      {latestSales.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          Nenhuma venda registrada ainda
        </div>
      ) : (
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Esta semana</p>
              <p className="mt-1 text-[20px] font-medium text-green-600">
                {formatCurrency(weekTotal)}
              </p>
              <VariationBadge current={weekTotal} previous={prevWeekTotal} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Este mes</p>
              <p className="mt-1 text-[20px] font-medium text-green-600">
                {formatCurrency(monthTotal)}
              </p>
              <VariationBadge current={monthTotal} previous={previousMonthTotal} />
            </div>
          </div>

          <div className="space-y-3">
            {latestSales.map(sale => (
              <div key={sale.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{sale.product_name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {sale.contact?.name ?? 'Sem cliente'} ·{' '}
                    {formatRelativeDate(`${sale.sale_date}T12:00:00`)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-gray-900">
                  {formatCurrency(Number(sale.value ?? 0))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
