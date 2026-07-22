'use client'

import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { useDashboard } from '@/hooks/use-dashboard'
import { WeekSelector } from '@/components/dashboard/week-selector'
import { KPICards } from '@/components/dashboard/kpi-cards'
import { WeeklyChart } from '@/components/dashboard/weekly-chart'
import { FunnelChart } from '@/components/dashboard/funnel-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { WelcomeState } from '@/components/dashboard/welcome-state'
import { getWeekLabel } from '@/lib/weeks'

interface DashboardMetricsProps {
  workspaceId: string
}

export function DashboardMetrics({ workspaceId }: DashboardMetricsProps) {
  const {
    kpis,
    chartData,
    funnelData,
    activities,
    isLoading,
    selectedWeek,
    isCurrentWeek,
    canGoBack,
    navigationDirection,
    realtimePulseKey,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    weekTitle,
  } = useDashboard(workspaceId)

  const selectedWeekKey = format(selectedWeek, 'yyyy-MM-dd')
  const weekLabel = getWeekLabel(selectedWeek)

  const isEmpty = useMemo(() => {
    if (isLoading || !kpis) return false

    return (
      kpis.revenue === 0 &&
      kpis.newLeads === 0 &&
      chartData.every(item => item.revenue === 0 && item.leads === 0)
    )
  }, [chartData, isLoading, kpis])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Operacao</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">Acompanhe os resultados da semana</p>
      </div>

      <WeekSelector
        weekTitle={weekTitle}
        isCurrentWeek={isCurrentWeek}
        canGoBack={canGoBack}
        isLoading={isLoading}
        onPrevious={goToPreviousWeek}
        onNext={goToNextWeek}
        onToday={goToCurrentWeek}
      />

      {isEmpty ? (
        <WelcomeState />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={weekTitle}
            initial={{
              opacity: 0,
              x: navigationDirection < 0 ? -24 : navigationDirection > 0 ? 24 : 0,
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              x: navigationDirection < 0 ? 24 : navigationDirection > 0 ? -24 : 0,
            }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <KPICards kpis={kpis} isLoading={isLoading} pulseKey={realtimePulseKey} />

            <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
              <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-3">
                <p className="mb-4 text-[14px] font-medium text-gray-700">
                  Evolucao das ultimas 12 semanas
                </p>
                <WeeklyChart
                  data={chartData}
                  selectedWeek={selectedWeekKey}
                  isLoading={isLoading && chartData.length === 0}
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
                <p className="mb-4 text-[14px] font-medium text-gray-700">Funil de conversao</p>
                <FunnelChart
                  data={funnelData}
                  isLoading={isLoading && funnelData.length === 0}
                />
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-5">
              <ActivityFeed activities={activities} weekLabel={weekLabel} isLoading={isLoading} />
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
