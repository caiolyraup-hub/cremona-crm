'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays } from 'date-fns'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { completeTaskAction } from '@/app/(dashboard)/dashboard/tasks/actions'
import { TaskModal } from '@/components/tasks/task-modal'
import { TaskPriorityBadge, type TaskPriority } from '@/components/tasks/task-priority-badge'
import {
  formatShortDate,
  getDateKey,
  getTodayDateKey,
  isDateKeyBeforeToday,
  isDateKeyToday,
} from '@/lib/formatters'
import type { TaskWithContact } from '@/types/app'
import type { Tables } from '@/types/database'

interface ContactCardTasksProps {
  tasks: Tables<'tasks'>[]
  contactId: string
  contactName: string
  workspaceId: string
}

function taskToTaskWithContact(
  task: Tables<'tasks'>,
  contactId: string,
  contactName: string
): TaskWithContact {
  return {
    ...task,
    contact: { id: contactId, name: contactName, phone: null, company: null },
  }
}

function DueDateLabel({ dueDate, isCompleted }: { dueDate: string | null; isCompleted: boolean }) {
  if (!dueDate || isCompleted) return null

  const todayKey = getTodayDateKey()
  const dueDateKey = getDateKey(dueDate)

  if (isDateKeyToday(dueDateKey, todayKey)) {
    return <span className="text-[11px] font-medium text-blue-600">Hoje</span>
  }

  if (isDateKeyBeforeToday(dueDateKey, todayKey)) {
    const days = differenceInCalendarDays(new Date(), new Date(`${dueDateKey}T00:00:00`))
    return (
      <span className="text-[11px] font-medium text-red-500">
        {days === 1 ? 'Ontem' : `${days}d atrás`}
      </span>
    )
  }

  return <span className="text-[11px] text-gray-400">{formatShortDate(dueDateKey)}</span>
}

export function ContactCardTasks({
  tasks: initialTasks,
  contactId,
  contactName,
  workspaceId,
}: ContactCardTasksProps) {
  const router = useRouter()
  const [localTasks, setLocalTasks] = useState(initialTasks)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Tables<'tasks'> | null>(null)
  const [isPending, startTransition] = useTransition()

  const openCount = localTasks.filter(t => !t.completed_at).length
  const maxShown = 3
  const shown = localTasks.slice(0, maxShown)
  const remaining = localTasks.length - maxShown

  function handleComplete(task: Tables<'tasks'>) {
    const previous = localTasks
    const nowIso = new Date().toISOString()
    const newCompleted = task.completed_at ? null : nowIso
    setLocalTasks(ts => ts.map(t => (t.id === task.id ? { ...t, completed_at: newCompleted } : t)))

    startTransition(async () => {
      const result = await completeTaskAction(task.id, workspaceId)
      if (result.error) {
        toast.error(result.error)
        setLocalTasks(previous)
      } else {
        router.refresh()
      }
    })
  }

  function handleSuccess() {
    router.refresh()
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tarefas</p>
        {openCount > 0 && (
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {openCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto flex h-6 items-center gap-1 rounded border border-gray-200 px-1.5 text-[11px] text-gray-500 transition-colors hover:border-[#378ADD] hover:text-[#378ADD]"
        >
          <Plus size={10} />
          Nova tarefa
        </button>
      </div>

      {localTasks.length === 0 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Nenhuma tarefa</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="text-xs text-[#378ADD] hover:underline"
          >
            Adicionar tarefa
          </button>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {shown.map(task => {
            const isCompleted = !!task.completed_at
            const priority = (task.priority as TaskPriority) ?? 'medium'

            return (
              <li key={task.id} className="flex items-start gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleComplete(task)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all disabled:opacity-50 ${
                    isCompleted
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 hover:border-[#378ADD]'
                  }`}
                >
                  {isCompleted && <Check size={9} className="text-white" strokeWidth={3} />}
                </button>

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setEditingTask(task)}
                    className={`text-left text-sm leading-5 transition-colors hover:text-[#378ADD] ${
                      isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {task.title}
                  </button>
                </div>

                {!isCompleted && <TaskPriorityBadge priority={priority} className="shrink-0" />}
                <DueDateLabel dueDate={task.due_date} isCompleted={isCompleted} />
              </li>
            )
          })}
        </ul>
      )}

      {remaining > 0 && (
        <a href={`/dashboard/tasks?contactId=${contactId}`} className="mt-2 block text-xs text-[#378ADD] hover:underline">
          Ver todas as {localTasks.length} tarefas →
        </a>
      )}

      <TaskModal
        mode="create"
        workspaceId={workspaceId}
        defaultContactId={contactId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />

      <TaskModal
        mode="edit"
        task={editingTask ? taskToTaskWithContact(editingTask, contactId, contactName) : undefined}
        workspaceId={workspaceId}
        defaultContactId={contactId}
        open={!!editingTask}
        onOpenChange={open => {
          if (!open) setEditingTask(null)
        }}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
