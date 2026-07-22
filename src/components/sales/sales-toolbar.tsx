'use client'

import { CalendarDays, Search, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/formatters'
import type { SaleStatusFilter, SalesPeriod } from '@/types/app'

interface SalesToolbarProps {
  period: SalesPeriod
  onPeriodChange: (period: SalesPeriod) => void
  customStart: string | null
  customEnd: string | null
  onCustomRangeChange: (start: string, end: string) => void
  statusFilter: SaleStatusFilter
  onStatusFilterChange: (status: SaleStatusFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  totalShowing: number
  totalValue: number
}

export function SalesToolbar({
  period,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomRangeChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  totalShowing,
  totalValue,
}: SalesToolbarProps) {
  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={value => onPeriodChange((value ?? 'this_month') as SalesPeriod)}>
          <SelectTrigger className="min-w-[180px] border-gray-200 text-sm">
            <CalendarDays size={14} className="text-gray-400" />
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="last_3_months">Ultimos 3 meses</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {period === 'custom' && (
          <>
            <input
              type="date"
              value={customStart ?? ''}
              onChange={event => onCustomRangeChange(event.target.value, customEnd ?? '')}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
            />
            <input
              type="date"
              value={customEnd ?? ''}
              onChange={event => onCustomRangeChange(customStart ?? '', event.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
            />
          </>
        )}

        <Select
          value={statusFilter}
          onValueChange={value => onStatusFilterChange((value ?? 'all') as SaleStatusFilter)}
        >
          <SelectTrigger className="min-w-[180px] border-gray-200 text-sm">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                Todos os status
              </span>
            </SelectItem>
            <SelectItem value="paid">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Pago
              </span>
            </SelectItem>
            <SelectItem value="pending">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Pendente
              </span>
            </SelectItem>
            <SelectItem value="cancelled">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                Cancelado
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="relative w-full sm:w-[200px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={event => onSearchQueryChange(event.target.value)}
            placeholder="Buscar por produto..."
            className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-8 text-sm text-gray-700 outline-none focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="ml-auto text-[13px] text-gray-500">
          {totalShowing} lancamento{totalShowing === 1 ? '' : 's'} ·{' '}
          <span className="font-medium text-green-600">{formatCurrency(totalValue)}</span>
        </div>
      </div>
    </div>
  )
}
