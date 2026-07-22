'use client'

import Link from 'next/link'
import { ArrowRight, CheckSquare, DollarSign, FileText, Phone, Mail, type LucideIcon } from 'lucide-react'
import { formatRelativeDate } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardActivity } from '@/types/app'

const TYPE_CONFIG: Record<string, { icon: LucideIcon; bg: string; color: string; label: string }> = {
  stage_change: { icon: ArrowRight, bg: 'bg-blue-100', color: 'text-blue-600', label: 'Mudanca de etapa' },
  task: { icon: CheckSquare, bg: 'bg-purple-100', color: 'text-purple-600', label: 'Tarefa' },
  sale: { icon: DollarSign, bg: 'bg-green-100', color: 'text-green-600', label: 'Venda' },
  note: { icon: FileText, bg: 'bg-gray-100', color: 'text-gray-600', label: 'Nota' },
  call: { icon: Phone, bg: 'bg-emerald-100', color: 'text-emerald-600', label: 'Ligacao' },
  email: { icon: Mail, bg: 'bg-sky-100', color: 'text-sky-600', label: 'E-mail' },
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="flex gap-3">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-32 rounded-md" />
            <Skeleton className="h-3 w-48 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface ActivityFeedProps {
  activities: DashboardActivity[]
  weekLabel: string
  isLoading: boolean
}

export function ActivityFeed({ activities, weekLabel, isLoading }: ActivityFeedProps) {
  const visible = activities.slice(0, 10)

  const typeCount = activities.reduce<Record<string, number>>((accumulator, activity) => {
    accumulator[activity.type] = (accumulator[activity.type] ?? 0) + 1
    return accumulator
  }, {})

  const summaryParts: string[] = []
  if (typeCount.stage_change) {
    summaryParts.push(`${typeCount.stage_change} mudanca${typeCount.stage_change > 1 ? 's' : ''} de etapa`)
  }
  if (typeCount.task) {
    summaryParts.push(`${typeCount.task} tarefa${typeCount.task > 1 ? 's' : ''}`)
  }
  if (typeCount.sale) {
    summaryParts.push(`${typeCount.sale} venda${typeCount.sale > 1 ? 's' : ''}`)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-medium text-gray-700">Atividades · {weekLabel}</p>
        {!isLoading && summaryParts.length > 0 ? (
          <p className="text-[12px] text-gray-400">{summaryParts.join(' · ')}</p>
        ) : null}
      </div>

      {isLoading ? (
        <ActivitySkeleton />
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">Nenhuma atividade nesta semana</p>
      ) : (
        <div className="relative">
          <div className="absolute bottom-0 left-3.5 top-0 w-px bg-gray-200" />
          <div className="space-y-4">
            {visible.map(activity => {
              const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.note
              const Icon = config.icon
              const contact = activity.contact as { id: string; name: string } | null

              return (
                <div key={activity.id} className="relative flex gap-3">
                  <div
                    className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon size={13} className={config.color} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    {contact ? (
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="text-[13px] font-medium text-gray-800 transition-colors hover:text-blue-600"
                      >
                        {contact.name}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-medium text-gray-800">-</span>
                    )}
                    {activity.content ? (
                      <p className="truncate text-[13px] text-gray-600">{activity.content}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {formatRelativeDate(activity.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
