'use client'

import { useState } from 'react'
import { Clock, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/formatters'
import { getSalesPeriodLabel } from '@/lib/sales'
import type { SalesPeriod, SalesSummary } from '@/types/app'

interface SalesReportProps {
  summary: SalesSummary | null
  isLoading: boolean
  period: SalesPeriod
}

export function SalesReport({ summary, isLoading, period }: SalesReportProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
              <div className="mt-4 h-8 w-32 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-3 w-40 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="h-[260px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
        <div className="h-[240px] animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm" />
      </div>
    )
  }

  if (!summary || summary.count === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Nenhuma venda no periodo selecionado"
        description="Registre sua primeira venda ou selecione um periodo diferente"
      />
    )
  }

  const maxTopProductTotal = Math.max(...summary.topProducts.map(product => product.total), 0)
  const maxWeekTotal = Math.max(...summary.weeklyData.map(item => item.total), 0)
  const paidSalesCount = summary.topProducts.reduce((acc, product) => acc + product.count, 0)
  const grossTotal = summary.totalPaid + summary.totalPending

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          icon={TrendingUp}
          iconClassName="text-green-600"
          title="Faturamento"
          value={formatCurrency(summary.totalPaid)}
          label="Receita confirmada no periodo"
          subinfo={`${paidSalesCount} venda${paidSalesCount === 1 ? '' : 's'} pagas`}
        />
        <ReportCard
          icon={DollarSign}
          iconClassName="text-blue-600"
          title="Ticket Medio"
          value={formatCurrency(summary.averageTicket)}
          label="Valor medio por venda"
          subinfo="Considerando somente vendas pagas"
        />
        <ReportCard
          icon={Clock}
          iconClassName={summary.totalPending > 0 ? 'text-amber-600' : 'text-gray-400'}
          title="A Receber"
          value={formatCurrency(summary.totalPending)}
          label={summary.totalPending > 0 ? 'Vendas pendentes' : 'Nenhum valor pendente'}
          subinfo={getSalesPeriodLabel(period)}
        />
        <ReportCard
          icon={ShoppingBag}
          iconClassName="text-violet-600"
          title="Total de Vendas"
          value={String(summary.count)}
          label="Lancamentos no periodo"
          subinfo={`${formatCurrency(grossTotal)} em negocios`}
        />
      </div>

      <WeeklyChart summary={summary} period={period} maxWeekTotal={maxWeekTotal} />

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Top produtos</h2>
          <p className="text-sm text-gray-500">Produtos com maior faturamento confirmado.</p>
        </div>

        <div className="space-y-3">
          {summary.topProducts.map((product, index) => (
            <div key={product.name} className="grid grid-cols-[28px_minmax(0,1fr)_96px_120px] items-center gap-3">
              <span className="text-sm text-gray-400">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#639922]"
                    style={{
                      width: `${maxTopProductTotal > 0 ? (product.total / maxTopProductTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-400">
                {product.count} venda{product.count === 1 ? '' : 's'}
              </span>
              <span className="text-right text-sm font-medium text-green-600">
                {formatCurrency(product.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function WeeklyChart({
  summary,
  period,
  maxWeekTotal,
}: {
  summary: SalesSummary
  period: SalesPeriod
  maxWeekTotal: number
}) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null)

  if (summary.weeklyData.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Sem dados para o periodo selecionado</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Faturamento por semana</h2>
        <p className="text-sm text-gray-500">
          Evolucao de vendas pagas em {getSalesPeriodLabel(period)}.
        </p>
      </div>

      <div className="flex h-[200px] items-end gap-2">
        {summary.weeklyData.map(item => {
          const pct = maxWeekTotal > 0 ? Math.max((item.total / maxWeekTotal) * 100, 4) : 4
          const isHovered = hoveredWeek === item.week

          return (
            <div
              key={item.week}
              className="group relative flex flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHoveredWeek(item.week)}
              onMouseLeave={() => setHoveredWeek(null)}
            >
              {isHovered && (
                <div className="absolute bottom-full mb-2 z-10 min-w-[120px] rounded-lg border border-gray-200 bg-white p-2.5 shadow-lg text-center pointer-events-none">
                  <p className="text-xs font-semibold text-gray-700">{item.week}</p>
                  <p className="mt-1 text-sm font-bold text-[#639922]">{formatCurrency(item.total)}</p>
                  <p className="text-[11px] text-gray-400">{item.count} venda{item.count === 1 ? '' : 's'}</p>
                </div>
              )}
              <div className="flex h-[160px] w-full items-end rounded-t-[6px] bg-gray-100">
                <div
                  className={`w-full rounded-t-[6px] transition-[height] duration-500 ease-out ${isHovered ? 'bg-[#4a7a28]' : 'bg-[#639922]'}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <p className="mt-2 truncate text-center text-[11px] text-gray-400 w-full px-1">{item.week}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportCard({
  icon: Icon,
  iconClassName,
  title,
  value,
  label,
  subinfo,
}: {
  icon: typeof TrendingUp
  iconClassName: string
  title: string
  value: string
  label: string
  subinfo: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconClassName} />
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-[#1a2b4a]">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xs text-gray-400">{subinfo}</p>
    </div>
  )
}
