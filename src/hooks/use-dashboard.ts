'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { addDays, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import {
  getWeekStart,
  isCurrentWeek,
  getPreviousWeek,
  getNextWeek,
  formatWeekTitle,
} from '@/lib/weeks'
import type { WeeklyKPIs, WeeklyChartData, FunnelStage, DashboardActivity } from '@/types/app'

function readWeekStorage(): Date {
  if (typeof window === 'undefined') return getWeekStart(new Date())

  try {
    const saved = sessionStorage.getItem('dashboard-week')
    if (saved) {
      const parsed = new Date(`${saved}T12:00:00`)
      if (!Number.isNaN(parsed.getTime())) {
        const resolvedWeek = getWeekStart(parsed)
        if (resolvedWeek <= getWeekStart(new Date())) return resolvedWeek
      }
    }
  } catch {
    // ignore
  }

  return getWeekStart(new Date())
}

export interface UseDashboardResult {
  kpis: WeeklyKPIs | null
  chartData: WeeklyChartData[]
  funnelData: FunnelStage[]
  activities: DashboardActivity[]
  isLoading: boolean
  selectedWeek: Date
  isCurrentWeek: boolean
  canGoBack: boolean
  navigationDirection: number
  realtimePulseKey: number
  goToPreviousWeek: () => void
  goToNextWeek: () => void
  goToCurrentWeek: () => void
  weekTitle: string
  refetch: () => void
}

export function useDashboard(workspaceId: string): UseDashboardResult {
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => readWeekStorage())
  const [kpis, setKpis] = useState<WeeklyKPIs | null>(null)
  const [chartData, setChartData] = useState<WeeklyChartData[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [isWeekLoading, setIsWeekLoading] = useState(true)
  const [isOverviewLoading, setIsOverviewLoading] = useState(true)
  const [weekTrigger, setWeekTrigger] = useState(0)
  const [overviewTrigger, setOverviewTrigger] = useState(0)
  const [navigationDirection, setNavigationDirection] = useState(0)
  const [realtimePulseKey, setRealtimePulseKey] = useState(0)
  const refetchWeekRef = useRef<() => void>(() => {})
  const refetchOverviewRef = useRef<() => void>(() => {})

  const oldest12WeeksStart = addDays(getWeekStart(new Date()), -11 * 7)
  const currentWeek = getWeekStart(new Date())
  const _isCurrentWeek = isCurrentWeek(selectedWeek)
  const canGoBack = selectedWeek > oldest12WeeksStart
  const isLoading =
    isWeekLoading || (isOverviewLoading && (chartData.length === 0 || funnelData.length === 0))

  useEffect(() => {
    let cancelled = false
    setIsWeekLoading(true)

    const weekStart = getWeekStart(selectedWeek)
    const weekStartKey = format(weekStart, 'yyyy-MM-dd')

    async function fetchWeekData() {
      const response = await fetch(
        `/api/dashboard/kpis?workspaceId=${encodeURIComponent(workspaceId)}&weekStart=${weekStartKey}`,
        { cache: 'no-store' }
      )

      if (cancelled) return

      if (response.ok) {
        const data = (await response.json()) as {
          kpis: WeeklyKPIs
          activities: DashboardActivity[]
        }
        setKpis(data.kpis)
        setActivities(data.activities)
      }

      setIsWeekLoading(false)
    }

    fetchWeekData()

    return () => {
      cancelled = true
    }
  }, [selectedWeek, weekTrigger, workspaceId])

  useEffect(() => {
    let cancelled = false

    if (chartData.length === 0 || funnelData.length === 0) {
      setIsOverviewLoading(true)
    }

    async function fetchOverview() {
      const response = await fetch(
        `/api/dashboard/overview?workspaceId=${encodeURIComponent(workspaceId)}`,
        { cache: 'no-store' }
      )

      if (cancelled) return

      if (response.ok) {
        const data = (await response.json()) as {
          chartData: WeeklyChartData[]
          funnelData: FunnelStage[]
        }
        setChartData(data.chartData)
        setFunnelData(data.funnelData)
      }

      setIsOverviewLoading(false)
    }

    fetchOverview()

    return () => {
      cancelled = true
    }
  }, [workspaceId, overviewTrigger])

  const refetchWeek = useCallback(() => setWeekTrigger(trigger => trigger + 1), [])
  const refetchOverview = useCallback(() => setOverviewTrigger(trigger => trigger + 1), [])
  const refetch = useCallback(() => {
    refetchWeek()
    refetchOverview()
  }, [refetchOverview, refetchWeek])

  refetchWeekRef.current = refetchWeek
  refetchOverviewRef.current = refetchOverview

  useEffect(() => {
    const supabase = createClient()

    const refreshWeek = () => {
      setRealtimePulseKey(key => key + 1)
      refetchWeekRef.current()
    }

    const refreshAll = () => {
      setRealtimePulseKey(key => key + 1)
      refetchWeekRef.current()
      refetchOverviewRef.current()
    }

    const channel = supabase
      .channel(`dashboard-updates-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales', filter: `workspace_id=eq.${workspaceId}` },
        refreshAll
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts', filter: `workspace_id=eq.${workspaceId}` },
        refreshAll
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${workspaceId}` },
        refreshWeek
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activities', filter: `workspace_id=eq.${workspaceId}` },
        refreshWeek
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [workspaceId])

  const goToPreviousWeek = useCallback(() => {
    setSelectedWeek(previous => {
      if (isWeekLoading || previous <= oldest12WeeksStart) return previous

      const resolvedWeek = getPreviousWeek(previous)
      setNavigationDirection(-1)

      try {
        sessionStorage.setItem('dashboard-week', format(resolvedWeek, 'yyyy-MM-dd'))
      } catch {
        // ignore
      }

      return resolvedWeek
    })
  }, [isWeekLoading, oldest12WeeksStart])

  const goToNextWeek = useCallback(() => {
    setSelectedWeek(previous => {
      if (isWeekLoading || isCurrentWeek(previous)) return previous

      const nextWeek = getNextWeek(previous)
      const resolvedWeek = nextWeek > currentWeek ? currentWeek : nextWeek
      setNavigationDirection(1)

      try {
        sessionStorage.setItem('dashboard-week', format(resolvedWeek, 'yyyy-MM-dd'))
      } catch {
        // ignore
      }

      return resolvedWeek
    })
  }, [currentWeek, isWeekLoading])

  const goToCurrentWeek = useCallback(() => {
    if (isWeekLoading) return

    setNavigationDirection(selectedWeek < currentWeek ? 1 : 0)

    try {
      sessionStorage.setItem('dashboard-week', format(currentWeek, 'yyyy-MM-dd'))
    } catch {
      // ignore
    }

    setSelectedWeek(currentWeek)
  }, [currentWeek, isWeekLoading, selectedWeek])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isWeekLoading) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const target = event.target
      if (target instanceof HTMLInputElement) return
      if (target instanceof HTMLTextAreaElement) return
      if (target instanceof HTMLSelectElement) return
      if (target instanceof HTMLElement && target.isContentEditable) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousWeek()
      }

      if (event.key === 'ArrowRight' && !_isCurrentWeek) {
        event.preventDefault()
        goToNextWeek()
      }

      if (event.key === 'h' || event.key === 'H') {
        goToCurrentWeek()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [_isCurrentWeek, goToCurrentWeek, goToNextWeek, goToPreviousWeek, isWeekLoading])

  return {
    kpis,
    chartData,
    funnelData,
    activities,
    isLoading,
    selectedWeek,
    isCurrentWeek: _isCurrentWeek,
    canGoBack,
    navigationDirection,
    realtimePulseKey,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    weekTitle: formatWeekTitle(selectedWeek),
    refetch,
  }
}
