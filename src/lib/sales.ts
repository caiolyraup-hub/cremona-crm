import {
  addDays,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameYear,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, formatRelativeDate, getDateKey } from '@/lib/formatters'
import type {
  CreateSaleInput,
  SalePaymentMethod,
  SalesPeriod,
  SalesSummary,
  SaleWithContact,
} from '@/types/app'

export const SALES_STATUS_LABELS = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
} as const

export const SALES_PAYMENT_METHOD_LABELS: Record<SalePaymentMethod, string> = {
  pix: 'PIX',
  card: 'Cartao',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  transfer: 'Transferencia',
}

export function normalizePaymentMethod(value: string | null | undefined): SalePaymentMethod | null {
  if (!value) return null

  const normalized = value.toLowerCase()
  if (normalized === 'pix') return 'pix'
  if (normalized === 'card' || normalized === 'cartao') return 'card'
  if (normalized === 'boleto') return 'boleto'
  if (normalized === 'cash' || normalized === 'dinheiro') return 'cash'
  if (normalized === 'transfer' || normalized === 'transferencia') return 'transfer'
  return null
}

export function mapSaleRow<T extends { payment_method: string | null }>(
  sale: T
): Omit<T, 'payment_method'> & { payment_method: SalePaymentMethod | null } {
  return {
    ...sale,
    payment_method: normalizePaymentMethod(sale.payment_method),
  }
}

export function getDateRange(
  period: SalesPeriod,
  customStart?: string | null,
  customEnd?: string | null,
  now = new Date()
): { start: Date; end: Date } {
  if (period === 'custom') {
    const start = customStart ? new Date(`${getDateKey(customStart)}T00:00:00`) : startOfMonth(now)
    const end = customEnd ? new Date(`${getDateKey(customEnd)}T23:59:59`) : now
    return { start, end }
  }

  if (period === 'this_week') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: now,
    }
  }

  if (period === 'this_month') {
    return {
      start: startOfMonth(now),
      end: now,
    }
  }

  return {
    start: subDays(now, 90),
    end: now,
  }
}

export function getDateRangeKeys(
  period: SalesPeriod,
  customStart?: string | null,
  customEnd?: string | null,
  now = new Date()
): { start: string; end: string } {
  const range = getDateRange(period, customStart, customEnd, now)
  return {
    start: format(range.start, 'yyyy-MM-dd'),
    end: format(range.end, 'yyyy-MM-dd'),
  }
}

export function getSalesPeriodLabel(
  period: SalesPeriod,
  customStart?: string | null,
  customEnd?: string | null
): string {
  if (period === 'this_week') return 'esta semana'
  if (period === 'this_month') return 'este mes'
  if (period === 'last_3_months') return 'ultimos 3 meses'

  const start = customStart ? formatShortLabel(customStart) : null
  const end = customEnd ? formatShortLabel(customEnd) : null
  if (start && end) return `${start} a ${end}`
  return 'periodo personalizado'
}

export function formatSaleActivity(productName: string, value: number): string {
  return `Venda registrada: ${productName} — ${formatCurrency(value)}`
}

export function formatSalePaymentActivity(value: number): string {
  return `Pagamento confirmado: ${formatCurrency(value)}`
}

export function sortSales<T extends { sale_date: string; created_at: string }>(sales: T[]): T[] {
  return [...sales].sort((a, b) => {
    const dateDiff = getDateKey(b.sale_date).localeCompare(getDateKey(a.sale_date))
    if (dateDiff !== 0) return dateDiff
    return b.created_at.localeCompare(a.created_at)
  })
}

export function getVisibleSalesTotals(sales: SaleWithContact[]): {
  paid: number
  pending: number
  cancelled: number
  total: number
} {
  return sales.reduce(
    (acc, sale) => {
      const value = Number(sale.value ?? 0)
      acc.total += value
      if (sale.status === 'paid') acc.paid += value
      if (sale.status === 'pending') acc.pending += value
      if (sale.status === 'cancelled') acc.cancelled += value
      return acc
    },
    { paid: 0, pending: 0, cancelled: 0, total: 0 }
  )
}

export function buildSalesSummary(
  sales: SaleWithContact[],
  period: SalesPeriod,
  customStart?: string | null,
  customEnd?: string | null
): SalesSummary {
  const range = getDateRange(period, customStart, customEnd)
  const paidSales = sales.filter(sale => sale.status === 'paid')
  const totalPaid = paidSales.reduce((sum, sale) => sum + Number(sale.value ?? 0), 0)
  const totalPending = sales
    .filter(sale => sale.status === 'pending')
    .reduce((sum, sale) => sum + Number(sale.value ?? 0), 0)
  const totalCancelled = sales
    .filter(sale => sale.status === 'cancelled')
    .reduce((sum, sale) => sum + Number(sale.value ?? 0), 0)

  const productMap = new Map<string, { name: string; count: number; total: number }>()
  const weekStarts = eachWeekOfInterval(
    {
      start: range.start,
      end: range.end,
    },
    { weekStartsOn: 1 }
  )

  const weeklyData = weekStarts.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekSales = paidSales.filter(sale => {
      const saleDate = new Date(`${getDateKey(sale.sale_date)}T12:00:00`)
      return saleDate >= weekStart && saleDate <= weekEnd
    })

    for (const sale of weekSales) {
      const key = sale.product_name.trim() || 'Sem nome'
      const current = productMap.get(key) ?? { name: key, count: 0, total: 0 }
      current.count += 1
      current.total += Number(sale.value ?? 0)
      productMap.set(key, current)
    }

    return {
      week: `Sem ${index + 1}`,
      total: weekSales.reduce((sum, sale) => sum + Number(sale.value ?? 0), 0),
      count: weekSales.length,
    }
  })

  if (weekStarts.length === 0) {
    for (const sale of paidSales) {
      const key = sale.product_name.trim() || 'Sem nome'
      const current = productMap.get(key) ?? { name: key, count: 0, total: 0 }
      current.count += 1
      current.total += Number(sale.value ?? 0)
      productMap.set(key, current)
    }
  }

  return {
    totalPaid,
    totalPending,
    totalCancelled,
    count: sales.length,
    averageTicket: paidSales.length > 0 ? totalPaid / paidSales.length : 0,
    topProducts: Array.from(productMap.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return b.count - a.count
    }),
    weeklyData,
  }
}

export function formatSalesListDate(date: string): string {
  const parsed = new Date(`${getDateKey(date)}T12:00:00`)
  return format(parsed, isSameYear(parsed, new Date()) ? 'd MMM' : 'd MMM yyyy', {
    locale: ptBR,
  })
}

export function formatSalesRelativeDate(date: string): string {
  return formatRelativeDate(`${getDateKey(date)}T12:00:00`)
}

export function getCurrentMonthRange(now = new Date()): { start: Date; end: Date } {
  return { start: startOfMonth(now), end: now }
}

export function getPreviousMonthRange(now = new Date()): { start: Date; end: Date } {
  const previous = subMonths(now, 1)
  return { start: startOfMonth(previous), end: endOfMonth(previous) }
}

export function getPreviousWeekRange(now = new Date()): { start: Date; end: Date } {
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 })
  const prevWeekStart = subDays(thisWeekStart, 7)
  const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 })
  return { start: prevWeekStart, end: prevWeekEnd }
}

export function getWeekStartLabel(date: string): string {
  const start = startOfWeek(new Date(`${getDateKey(date)}T12:00:00`), { weekStartsOn: 1 })
  return format(start, "d 'de' MMM", { locale: ptBR })
}

function formatShortLabel(date: string): string {
  try {
    return format(new Date(`${getDateKey(date)}T12:00:00`), 'd MMM', { locale: ptBR })
  } catch {
    return date
  }
}

export function normalizeSaleInput(input: CreateSaleInput): CreateSaleInput {
  return {
    ...input,
    product_name: input.product_name.trim(),
    sale_date: getDateKey(input.sale_date),
    payment_method: normalizePaymentMethod(input.payment_method) ?? 'pix',
    notes: input.notes?.trim() || undefined,
  }
}

export function isSaleDateAllowed(dateKey: string, now = new Date()): boolean {
  const maxDate = addDays(now, 7)
  return new Date(`${dateKey}T12:00:00`) <= maxDate
}
