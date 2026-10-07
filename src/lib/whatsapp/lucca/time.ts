import {
  DEFAULT_LUCCA_END_HOUR,
  DEFAULT_LUCCA_START_HOUR,
  DEFAULT_LUCCA_TIME_ZONE,
} from './config'

export function getHourInTimeZone(date: Date, timeZone = DEFAULT_LUCCA_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value)
  if (!Number.isInteger(hour)) throw new Error(`Fuso horario invalido: ${timeZone}`)
  return hour
}

export function isWithinLuccaWindow(
  date: Date,
  options: {
    timeZone?: string
    startHour?: number
    endHour?: number
  } = {}
): boolean {
  const hour = getHourInTimeZone(date, options.timeZone)
  const startHour = options.startHour ?? DEFAULT_LUCCA_START_HOUR
  const endHour = options.endHour ?? DEFAULT_LUCCA_END_HOUR

  if (startHour === endHour) return true
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

export function getGreeting(date: Date, timeZone = DEFAULT_LUCCA_TIME_ZONE) {
  const hour = getHourInTimeZone(date, timeZone)
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatArrivalTime(date: Date, timeZone = DEFAULT_LUCCA_TIME_ZONE) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(date)
}
