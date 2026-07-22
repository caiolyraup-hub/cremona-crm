'use client'

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { WeeklyChartData } from '@/types/app'

interface WeeklyChartProps {
  data: WeeklyChartData[]
  selectedWeek: string
  isLoading: boolean
}

function formatYAxisRevenue(value: number): string {
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`
  return `R$${value}`
}

interface TooltipPayload {
  name: string
  value: number
  color: string
  payload: WeeklyChartData
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const revenue = payload.find(item => item.name === 'revenue')
  const leads = payload.find(item => item.name === 'leads')
  const point = payload[0]?.payload
  const isEmptyWeek = (revenue?.value ?? 0) === 0 && (leads?.value ?? 0) === 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-md">
      <p className="mb-1 font-medium text-gray-700">Semana: {point?.weekRangeLabel ?? label}</p>
      {isEmptyWeek ? <p className="text-gray-500">Nenhuma atividade nesta semana</p> : null}
      {revenue && !isEmptyWeek ? (
        <p className="text-blue-600">Faturamento: {formatCurrency(revenue.value)}</p>
      ) : null}
      {leads && !isEmptyWeek ? <p className="text-green-600">Novos leads: {leads.value}</p> : null}
    </div>
  )
}

export function WeeklyChart({ data, selectedWeek, isLoading }: WeeklyChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[260px] w-full rounded-md" />
  }

  const selectedItem = data.find(item => item.weekStart === selectedWeek)
  const selectedLabel = selectedItem?.weekLabel
  const maxRevenue = Math.max(...data.map(item => item.revenue), 1)
  const maxLeads = Math.max(...data.map(item => item.leads), 1)

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="weekLabel"
            interval={0}
            minTickGap={0}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="revenue"
            orientation="left"
            tickFormatter={formatYAxisRevenue}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxRevenue * 1.1]}
          />
          <YAxis
            yAxisId="leads"
            orientation="right"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, maxLeads * 1.2]}
          />
          <Tooltip content={<CustomTooltip />} />
          {selectedLabel ? (
            <ReferenceArea
              yAxisId="revenue"
              x1={selectedLabel}
              x2={selectedLabel}
              fill="#EFF6FF"
              strokeOpacity={0}
            />
          ) : null}
          <Bar yAxisId="revenue" dataKey="revenue" radius={[3, 3, 0, 0]}>
            {data.map(item => (
              <Cell
                key={item.weekStart}
                fill={item.weekStart === selectedWeek ? '#2563EB' : '#378ADD'}
                opacity={item.weekStart === selectedWeek ? 1 : 0.82}
              />
            ))}
          </Bar>
          <Line
            yAxisId="leads"
            dataKey="leads"
            stroke="#16a34a"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#378ADD]" />
          Faturamento
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-block w-5 border-t-2 border-green-600" />
          Novos leads
        </div>
      </div>
    </div>
  )
}
