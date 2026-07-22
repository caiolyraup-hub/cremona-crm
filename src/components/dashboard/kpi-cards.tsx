'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, UserPlus, Target, CheckCircle2, LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeeklyKPIs } from '@/types/app'

interface KPICardProps {
  title: string
  value: number
  previousValue: number
  icon: LucideIcon
  color: 'green' | 'blue' | 'purple' | 'amber'
  formatValue: (value: number) => string
  footnote?: string
  isPulsing?: boolean
}

const COLOR_MAP = {
  green: { bg: 'bg-green-50', icon: 'text-green-600' },
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
}

function KPIVariation({ value, previous }: { value: number; previous: number }) {
  if (previous === 0 && value === 0) return null
  if (previous === 0 && value > 0) {
    return <span className="text-xs font-medium text-blue-600">Novo</span>
  }

  const pct = ((value - previous) / previous) * 100
  const abs = Math.abs(pct).toFixed(0)

  if (pct > 0) {
    return (
      <span className="text-xs font-medium text-green-600">
        +{abs}% <span className="font-normal text-gray-400">vs semana anterior</span>
      </span>
    )
  }

  if (pct < 0) {
    return (
      <span className="text-xs font-medium text-red-500">
        -{abs}% <span className="font-normal text-gray-400">vs semana anterior</span>
      </span>
    )
  }

  return <span className="text-xs text-gray-400">= igual vs semana anterior</span>
}

function KPICard({
  title,
  value,
  previousValue,
  icon: Icon,
  color,
  formatValue,
  footnote,
  isPulsing,
}: KPICardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div
      className={`relative rounded-xl border bg-white p-5 transition-shadow ${
        isPulsing ? 'border-blue-200 shadow-[0_0_0_4px_rgba(59,130,246,0.10)]' : 'border-gray-200'
      }`}
    >
      <div className={`absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg}`}>
        <Icon size={18} className={colors.icon} />
      </div>
      <p className="leading-none text-[28px] font-medium text-gray-900">{formatValue(value)}</p>
      <p className="mt-1 text-[13px] text-gray-500">{title}</p>
      <div className="mt-2">
        <KPIVariation value={value} previous={previousValue} />
      </div>
      {footnote ? <p className="mt-2 text-[11px] text-gray-400">{footnote}</p> : null}
    </div>
  )
}

function KPICardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <Skeleton className="mb-2 h-7 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  )
}

interface KPICardsProps {
  kpis: WeeklyKPIs | null
  isLoading: boolean
  pulseKey: number
}

function formatConversionRate(value: number): string {
  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)
  return `Taxa: ${rounded}% dos leads gerados`
}

export function KPICards({ kpis, isLoading, pulseKey }: KPICardsProps) {
  const [isPulsing, setIsPulsing] = useState(false)

  useEffect(() => {
    if (pulseKey === 0) return
    setIsPulsing(true)
    const timer = window.setTimeout(() => setIsPulsing(false), 1400)
    return () => window.clearTimeout(timer)
  }, [pulseKey])

  if (isLoading || !kpis) {
    return (
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <KPICardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KPICard
        title="Faturamento"
        value={kpis.revenue}
        previousValue={kpis.revenuePrev}
        icon={TrendingUp}
        color="green"
        formatValue={formatCurrency}
        isPulsing={isPulsing}
      />
      <KPICard
        title="Novos Leads"
        value={kpis.newLeads}
        previousValue={kpis.newLeadsPrev}
        icon={UserPlus}
        color="blue"
        formatValue={value => value.toString()}
        isPulsing={isPulsing}
      />
      <KPICard
        title="Fechamentos"
        value={kpis.conversions}
        previousValue={kpis.conversionsPrev}
        icon={Target}
        color="purple"
        formatValue={value => value.toString()}
        footnote={formatConversionRate(kpis.conversionRate)}
        isPulsing={isPulsing}
      />
      <KPICard
        title="Tarefas Concluidas"
        value={kpis.tasksCompleted}
        previousValue={kpis.tasksCompletedPrev}
        icon={CheckCircle2}
        color="amber"
        formatValue={value => value.toString()}
        isPulsing={isPulsing}
      />
    </div>
  )
}
