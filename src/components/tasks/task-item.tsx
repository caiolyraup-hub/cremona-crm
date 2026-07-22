'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays } from 'date-fns'
import { Check, FileText, MoreVertical } from 'lucide-react'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import {
  formatShortDate,
  getDateKey,
  getTodayDateKey,
  isDateKeyBeforeToday,
  isDateKeyToday,
} from '@/lib/formatters'
import { TaskPriorityBadge, type TaskPriority } from './task-priority-badge'
import type { TaskWithContact } from '@/types/app'

const PRIORITY_HOVER: Record<TaskPriority, string> = {
  high: 'hover:border-red-400',
  medium: 'hover:border-amber-400',
  low: 'hover:border-gray-400',
}

interface TaskItemProps {
  task: TaskWithContact
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (task: TaskWithContact) => void
}

export function TaskItem({ task, onComplete, onDelete, onEdit }: TaskItemProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const isCompleted = !!task.completed_at
  const todayKey = getTodayDateKey()
  const dueDateKey = getDateKey(task.due_date)
  const isToday = !isCompleted && isDateKeyToday(dueDateKey, todayKey)
  const isOverdue = !isCompleted && isDateKeyBeforeToday(dueDateKey, todayKey)
  const priority = (task.priority as TaskPriority) ?? 'medium'

  let dueDateNode: React.ReactNode = null
  if (dueDateKey && !isCompleted) {
    if (isToday) {
      dueDateNode = <span className="text-xs font-medium text-blue-600">Hoje</span>
    } else if (isOverdue) {
      const days = differenceInCalendarDays(new Date(), new Date(`${dueDateKey}T00:00:00`))
      const label = days === 1 ? 'Vencida ontem' : `Vencida há ${days} dias`
      dueDateNode = <span className="text-xs font-medium text-red-600">{label}</span>
    } else {
      dueDateNode = <span className="text-xs text-gray-500">{formatShortDate(dueDateKey)}</span>
    }
  }

  function handleMenuBlur() {
    setTimeout(() => {
      setMenuOpen(false)
      setDeleteConfirm(false)
    }, 150)
  }

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    setMenuOpen(false)
    setDeleteConfirm(false)
    onDelete(task.id)
  }

  return (
    <div className="group flex min-h-[48px] items-start gap-3 border-b border-gray-100 px-3 py-3 last:border-0 hover:bg-gray-50">
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          isCompleted
            ? 'border-green-500 bg-green-500'
            : `border-gray-300 ${PRIORITY_HOVER[priority]}`
        }`}
      >
        {isCompleted && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-5 transition-all duration-300 ${
            isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
          }`}
        >
          {task.description && !isCompleted && (
            <FileText size={12} className="mr-1 inline text-gray-400" />
          )}
          {task.title}
        </p>
        {task.contact && (
          <button
            type="button"
            onClick={() => router.push(`/dashboard/contacts/${task.contact!.id}`)}
            className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#378ADD]"
          >
            <ContactAvatar name={task.contact.name} size="sm" />
            <span className="truncate hover:underline">{task.contact.name}</span>
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!isCompleted && <TaskPriorityBadge priority={priority} />}
        {dueDateNode}

        <div
          className="relative opacity-0 transition-opacity group-hover:opacity-100"
          onBlur={handleMenuBlur}
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(o => !o)
              setDeleteConfirm(false)
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          >
            <MoreVertical size={13} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-7 z-50 min-w-[148px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onMouseDown={() => {
                  setMenuOpen(false)
                  onEdit(task)
                }}
                className="flex w-full items-center px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Editar
              </button>
              {task.contact && (
                <button
                  type="button"
                  onMouseDown={() => {
                    setMenuOpen(false)
                    router.push(`/dashboard/contacts/${task.contact!.id}`)
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Ver contato
                </button>
              )}
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onMouseDown={handleDelete}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  deleteConfirm ? 'font-medium text-red-600' : 'text-gray-700'
                }`}
              >
                {deleteConfirm ? 'Confirmar exclusão' : 'Excluir'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
