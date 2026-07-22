'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSalesSummaryAction } from '@/app/(dashboard)/dashboard/sales/actions'
import { createClient } from '@/lib/supabase/client'
import { getDateRangeKeys, mapSaleRow, sortSales } from '@/lib/sales'
import type {
  SaleStatusFilter,
  SalesPeriod,
  SalesSummary,
  SalesView,
  SaleWithContact,
} from '@/types/app'

const VALID_PERIODS: SalesPeriod[] = ['this_week', 'this_month', 'last_3_months', 'custom']
const VALID_STATUSES: SaleStatusFilter[] = ['all', 'paid', 'pending', 'cancelled']

function readStorage<T>(key: string, valid: T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const saved = sessionStorage.getItem(key) as T | null
  return saved && valid.includes(saved) ? saved : fallback
}

function writeStorage(key: string, value: string) {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, value)
}

export interface UseSalesResult {
  sales: SaleWithContact[]
  summary: SalesSummary | null
  isLoading: boolean
  isSummaryLoading: boolean
  period: SalesPeriod
  setPeriod: (p: SalesPeriod) => void
  customStart: string | null
  customEnd: string | null
  setCustomRange: (start: string, end: string) => void
  statusFilter: SaleStatusFilter
  setStatusFilter: (s: SaleStatusFilter) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  view: SalesView
  setView: (v: SalesView) => void
  refetch: () => void
}

export function useSales(workspaceId: string, contactId?: string): UseSalesResult {
  const [sales, setSales] = useState<SaleWithContact[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  const [period, setPeriodState] = useState<SalesPeriod>(() =>
    readStorage('sales-period', VALID_PERIODS, 'this_month')
  )
  const [customStart, setCustomStart] = useState<string | null>(null)
  const [customEnd, setCustomEnd] = useState<string | null>(null)
  const [statusFilter, setStatusFilterState] = useState<SaleStatusFilter>(() =>
    readStorage('sales-status', VALID_STATUSES, 'all')
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [view, setView] = useState<SalesView>('list')

  const setPeriod = useCallback((p: SalesPeriod) => {
    setPeriodState(p)
    writeStorage('sales-period', p)
  }, [])

  const setStatusFilter = useCallback((s: SaleStatusFilter) => {
    setStatusFilterState(s)
    writeStorage('sales-status', s)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    let cancelled = false

    async function fetchSales() {
      setIsLoading(true)
      const supabase = createClient()
      const range = getDateRangeKeys(period, customStart, customEnd)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('sales')
        .select('*, contact:contacts(id, name, phone, company)')
        .eq('workspace_id', workspaceId)
        .gte('sale_date', range.start)
        .lte('sale_date', range.end)
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (contactId) query = query.eq('contact_id', contactId)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)
      if (debouncedSearch) query = query.ilike('product_name', `%${debouncedSearch}%`)

      const { data } = await query
      if (cancelled) return

      setSales(sortSales(((data ?? []) as SaleWithContact[]).map(mapSaleRow)))
      setIsLoading(false)
    }

    fetchSales()
    return () => { cancelled = true }
  }, [workspaceId, contactId, period, customStart, customEnd, statusFilter, debouncedSearch, fetchTrigger])

  useEffect(() => {
    let cancelled = false

    async function fetchSummary() {
      setIsSummaryLoading(true)
      try {
        const result = await getSalesSummaryAction(
          workspaceId,
          period,
          customStart ?? undefined,
          customEnd ?? undefined,
          contactId
        )
        if (!cancelled) setSummary(result)
      } finally {
        if (!cancelled) setIsSummaryLoading(false)
      }
    }

    fetchSummary()
    return () => { cancelled = true }
  }, [workspaceId, contactId, period, customStart, customEnd, fetchTrigger])

  const setCustomRange = useCallback((start: string, end: string) => {
    setCustomStart(start || null)
    setCustomEnd(end || null)
  }, [])

  const refetch = useCallback(() => setFetchTrigger(v => v + 1), [])

  return useMemo(
    () => ({
      sales,
      summary,
      isLoading,
      isSummaryLoading,
      period,
      setPeriod,
      customStart,
      customEnd,
      setCustomRange,
      statusFilter,
      setStatusFilter,
      searchQuery,
      setSearchQuery,
      view,
      setView,
      refetch,
    }),
    [
      sales,
      summary,
      isLoading,
      isSummaryLoading,
      period,
      setPeriod,
      customStart,
      customEnd,
      setCustomRange,
      statusFilter,
      setStatusFilter,
      searchQuery,
      view,
      refetch,
    ]
  )
}
