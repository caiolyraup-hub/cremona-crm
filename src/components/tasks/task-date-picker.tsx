'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  nextMonday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateForDatabase, formatTaskDueDate, getTodayDateKey, parseDateKeyAsLocalDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface TaskDatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  className?: string
}

function getQuickOptions() {
  const today = new Date()

  return [
    { label: 'Hoje', value: formatDateForDatabase(today) },
    { label: 'Amanha', value: formatDateForDatabase(addDays(today, 1)) },
    { label: 'Prox. semana', value: formatDateForDatabase(nextMonday(today)) },
  ]
}

export function TaskDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar prazo',
  allowClear = true,
  className,
}: TaskDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseDateKeyAsLocalDate(value)
  const [visibleMonth, setVisibleMonth] = useState<Date>(selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement | null>(null)
  const todayKey = getTodayDateKey()
  const quickOptions = useMemo(() => getQuickOptions(), [])

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(selectedDate)
    }
  }, [selectedDate])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 0 })

    return eachDayOfInterval({ start, end })
  }, [visibleMonth])

  function handleSelect(date: Date) {
    onChange(formatDateForDatabase(date))
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen((open) => !open)}
        className={cn('justify-start gap-2 px-3 text-sm font-normal', !value && 'text-gray-500')}
      >
        <CalendarIcon size={14} />
        <span>{value ? formatTaskDueDate(value) : placeholder}</span>
        {value && allowClear ? (
          <span
            className="ml-auto rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            onClick={(event) => {
              event.stopPropagation()
              onChange('')
            }}
          >
            <X size={12} />
          </span>
        ) : null}
      </Button>

      {isOpen ? (
        <div className="absolute left-0 top-11 z-50 w-[320px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setVisibleMonth((month) => subMonths(month, 1))}
            >
              <ChevronLeft size={14} />
            </Button>
            <div className="text-sm font-medium capitalize text-gray-800">
              {format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
            >
              <ChevronRight size={14} />
            </Button>
          </div>

          <Input
            type="date"
            value={value}
            onChange={(event) => {
              onChange(event.target.value)
              if (event.target.value) {
                const nextDate = parseDateKeyAsLocalDate(event.target.value)
                if (nextDate) {
                  setVisibleMonth(nextDate)
                }
              }
            }}
            className="mb-3"
          />

          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  value === option.value
                    ? 'bg-[#378ADD] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {option.label}
              </button>
            ))}
            {allowClear ? (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Limpar prazo
              </button>
            ) : null}
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-400">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayLabel, index) => (
              <span key={`${dayLabel}-${index}`}>{dayLabel}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayKey = formatDateForDatabase(day)
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const isCurrentMonth = isSameMonth(day, visibleMonth)
              const isToday = dayKey === todayKey

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-lg text-sm transition-colors',
                    isSelected
                      ? 'bg-[#378ADD] font-medium text-white'
                      : isCurrentMonth
                        ? 'text-gray-700 hover:bg-gray-100'
                        : 'text-gray-300 hover:bg-gray-50',
                    isToday && !isSelected && 'border border-blue-200 text-[#378ADD]'
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
