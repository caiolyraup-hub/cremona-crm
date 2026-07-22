import { addDays, format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }
  return phone
}

export function formatFullDate(date: string): string {
  try {
    return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return date
  }
}

export function formatRelativeDate(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
  } catch {
    return date
  }
}

export function getDateKey(date: string | null | undefined): string {
  if (!date) return ''
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10)

  try {
    return format(new Date(date), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export function parseDateKeyAsLocalDate(date: string | null | undefined): Date | null {
  const dateKey = getDateKey(date)
  if (!dateKey) return null

  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null

  const parsedDate = new Date(year, month - 1, day)

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null
  }

  return parsedDate
}

export function formatDateForDatabase(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function getTodayDateKey(): string {
  return formatDateForDatabase(new Date())
}

export function getDateKeyDaysFromNow(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return format(addDays(new Date(`${dateKey}T00:00:00`), days), 'yyyy-MM-dd')
}

export function getDayRangeUtc(dateKey: string): { start: string; end: string } {
  return {
    start: `${dateKey}T00:00:00.000Z`,
    end: `${addDaysToDateKey(dateKey, 1)}T00:00:00.000Z`,
  }
}

export function isDateKeyToday(
  date: string | null | undefined,
  todayKey = getTodayDateKey()
): boolean {
  const dateKey = getDateKey(date)
  return !!dateKey && dateKey === todayKey
}

export function isDateKeyBeforeToday(
  date: string | null | undefined,
  todayKey = getTodayDateKey()
): boolean {
  const dateKey = getDateKey(date)
  return !!dateKey && dateKey < todayKey
}

export function formatShortDate(date: string | null | undefined): string {
  const parsedDate = parseDateKeyAsLocalDate(date)
  if (!parsedDate) return ''

  try {
    return format(parsedDate, 'd MMM', { locale: ptBR })
  } catch {
    return getDateKey(date)
  }
}

export function formatTaskDueDate(date: string | null | undefined): string {
  const dateKey = getDateKey(date)
  if (!dateKey) return 'Sem prazo'

  const todayKey = getTodayDateKey()
  const tomorrowKey = addDaysToDateKey(todayKey, 1)

  if (dateKey === todayKey) return 'Hoje'
  if (dateKey === tomorrowKey) return 'Amanha'

  const parsedDate = parseDateKeyAsLocalDate(dateKey)
  if (!parsedDate) return dateKey

  try {
    return format(parsedDate, "d 'de' MMM", { locale: ptBR })
  } catch {
    return dateKey
  }
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
]

export function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (((hash << 5) - hash + name.charCodeAt(i)) | 0)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const TAG_HEX_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#6366F1']

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (((hash << 5) - hash + tag.charCodeAt(i)) | 0)
  }
  return TAG_HEX_COLORS[Math.abs(hash) % TAG_HEX_COLORS.length]
}
