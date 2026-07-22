import {
  addDays,
  endOfWeek,
  format,
  getISOWeek,
  isSameWeek,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function getWeekStart(date: Date): Date {
  const d = startOfWeek(date, { weekStartsOn: 1 })
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekEnd(date: Date): Date {
  const d = endOfWeek(date, { weekStartsOn: 1 })
  d.setHours(23, 59, 59, 999)
  return d
}

export function getWeekLabel(weekStart: Date): string {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()

  if (sameMonth) {
    return `${format(weekStart, 'd', { locale: ptBR })} a ${format(weekEnd, 'd MMM', { locale: ptBR })}`
  }
  if (sameYear) {
    return `${format(weekStart, 'd MMM', { locale: ptBR })} a ${format(weekEnd, 'd MMM', { locale: ptBR })}`
  }
  return `${format(weekStart, 'd MMM yyyy', { locale: ptBR })} a ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`
}

export function getWeekNumber(date: Date): number {
  return getISOWeek(date)
}

export function getLast12Weeks(): Date[] {
  const currentWeekStart = getWeekStart(new Date())
  const weeks: Date[] = []
  for (let i = 11; i >= 0; i--) {
    weeks.push(addDays(currentWeekStart, -i * 7))
  }
  return weeks
}

export function isCurrentWeek(date: Date): boolean {
  return isSameWeek(date, new Date(), { weekStartsOn: 1 })
}

export function getPreviousWeek(date: Date): Date {
  return addDays(getWeekStart(date), -7)
}

export function getNextWeek(date: Date): Date {
  return addDays(getWeekStart(date), 7)
}

export function formatWeekTitle(date: Date): string {
  return `Semana ${getWeekNumber(date)} · ${getWeekLabel(date)}`
}
