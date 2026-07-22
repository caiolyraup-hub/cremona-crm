'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekSelectorProps {
  weekTitle: string
  isCurrentWeek: boolean
  canGoBack: boolean
  isLoading: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function WeekSelector({
  weekTitle,
  isCurrentWeek,
  canGoBack,
  isLoading,
  onPrevious,
  onNext,
  onToday,
}: WeekSelectorProps) {
  return (
    <div className="mb-6">
      <div className="group flex flex-col items-center">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onPrevious}
            disabled={isLoading || !canGoBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Semana anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span
            className="text-center text-base font-medium text-gray-800"
            style={{ minWidth: 260 }}
          >
            {weekTitle}
          </span>

          {!isCurrentWeek ? (
            <button
              onClick={onToday}
              disabled={isLoading}
              className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Hoje
            </button>
          ) : null}

          <button
            onClick={onNext}
            disabled={isLoading || isCurrentWeek}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Proxima semana"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <p className="mt-2 text-[11px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
          Use ← → para navegar · H para hoje
        </p>
      </div>
    </div>
  )
}
