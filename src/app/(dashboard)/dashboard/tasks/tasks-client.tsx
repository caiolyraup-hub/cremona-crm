'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckSquare, ChevronDown, ChevronUp, User, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { TaskList } from '@/components/tasks/task-list'
import { TaskModal } from '@/components/tasks/task-modal'
import { TaskQuickAdd } from '@/components/tasks/task-quick-add'
import { TasksToolbar } from '@/components/tasks/tasks-toolbar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useTasks } from '@/hooks/use-tasks'
import { addDaysToDateKey, getDateKey, getDateKeyDaysFromNow, getTodayDateKey } from '@/lib/formatters'
import type { TaskWithContact } from '@/types/app'

function groupTasksForAllView(
  tasks: TaskWithContact[],
  showCompleted: boolean
): { key: string; title: string; tasks: TaskWithContact[]; isOverdue: boolean }[] {
  const todayKey = getTodayDateKey()
  const tomorrowKey = addDaysToDateKey(todayKey, 1)
  const nextWeekKey = getDateKeyDaysFromNow(7)

  const openTasks = tasks.filter(t => !t.completed_at)
  const overdue = openTasks.filter(t => !!t.due_date && getDateKey(t.due_date) < todayKey)
  const todayTasks = openTasks.filter(t => getDateKey(t.due_date) === todayKey)
  const thisWeek = openTasks.filter(t => {
    const dueDateKey = getDateKey(t.due_date)
    return !!dueDateKey && dueDateKey >= tomorrowKey && dueDateKey <= nextWeekKey
  })
  const later = openTasks.filter(t => {
    const dueDateKey = getDateKey(t.due_date)
    return !!dueDateKey && dueDateKey > nextWeekKey
  })
  const noDate = openTasks.filter(t => !t.due_date)
  const completed = tasks.filter(t => !!t.completed_at)

  return [
    { key: 'overdue', title: 'Vencidas', tasks: overdue, isOverdue: true },
    { key: 'today', title: 'Hoje', tasks: todayTasks, isOverdue: false },
    { key: 'thisWeek', title: 'Esta semana', tasks: thisWeek, isOverdue: false },
    { key: 'later', title: 'Mais tarde', tasks: later, isOverdue: false },
    { key: 'noDate', title: 'Sem data', tasks: noDate, isOverdue: false },
    ...(showCompleted && completed.length > 0
      ? [{ key: 'completed', title: 'Concluídas', tasks: completed, isOverdue: false }]
      : []),
  ].filter(group => group.tasks.length > 0)
}

interface TasksClientProps {
  workspaceId: string
  contactId?: string
  contactName?: string
}

export function TasksClient({ workspaceId, contactId, contactName }: TasksClientProps) {
  const router = useRouter()
  const {
    tasks,
    todayTasks,
    overdueTasks,
    totalCompleted,
    isLoading,
    view,
    setView,
    priority,
    setPriority,
    showCompleted,
    setShowCompleted,
    completeTask,
    deleteTask,
    refetch,
  } = useTasks(workspaceId, contactId)

  const [overdueExpanded, setOverdueExpanded] = useState(true)
  const [editingTask, setEditingTask] = useState<TaskWithContact | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const todayKey = getTodayDateKey()

  const todayViewTasks = useMemo(
    () => tasks.filter(t => !t.completed_at && getDateKey(t.due_date) === todayKey),
    [tasks, todayKey]
  )
  const todayViewOverdue = useMemo(
    () => tasks.filter(t => !t.completed_at && !!t.due_date && getDateKey(t.due_date) < todayKey),
    [tasks, todayKey]
  )

  const totalOpen = tasks.filter(t => !t.completed_at).length

  const description = isLoading
    ? 'Carregando...'
    : view === 'today'
      ? [
          `${todayTasks.length} ${todayTasks.length === 1 ? 'tarefa' : 'tarefas'} para hoje`,
          overdueTasks.length > 0
            ? `${overdueTasks.length} vencida${overdueTasks.length > 1 ? 's' : ''}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : [
          `${totalOpen} ${totalOpen === 1 ? 'aberta' : 'abertas'}`,
          totalCompleted > 0
            ? `${totalCompleted} concluída${totalCompleted > 1 ? 's' : ''}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')

  const groups = useMemo(
    () => (view === 'all' ? groupTasksForAllView(tasks, showCompleted) : []),
    [tasks, showCompleted, view]
  )

  const callbacks = {
    onComplete: completeTask,
    onDelete: deleteTask,
    onEdit: (task: TaskWithContact) => setEditingTask(task),
  }

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description={description}
        action={
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[#378ADD] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5]"
          >
            <CheckSquare size={15} />
            Nova tarefa
          </button>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <TasksToolbar
            view={view}
            onViewChange={setView}
            priority={priority}
            onPriorityChange={setPriority}
            showCompleted={showCompleted}
            onShowCompletedChange={setShowCompleted}
            totalOpen={totalOpen}
            totalOverdue={overdueTasks.length}
            totalCompleted={totalCompleted}
          />

          {contactId && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <User size={14} className="shrink-0 text-blue-500" />
              <span className="flex-1 text-sm text-blue-700">
                Tarefas de <strong>{contactName ?? 'contato'}</strong>
              </span>
              <button
                type="button"
                onClick={() => router.push('/dashboard/tasks')}
                className="flex h-5 w-5 items-center justify-center rounded text-blue-400 hover:bg-blue-100 hover:text-blue-600"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <TaskQuickAdd
            workspaceId={workspaceId}
            onCreated={refetch}
            defaultContactId={contactId}
          />

          {view === 'today' && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {todayViewOverdue.length > 0 && (
                <div className="border-b border-gray-100 bg-red-50">
                  <button
                    type="button"
                    onClick={() => setOverdueExpanded(expanded => !expanded)}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
                  >
                    <AlertCircle size={14} className="shrink-0 text-red-500" />
                    <span className="flex-1 text-xs font-semibold text-red-700">
                      {todayViewOverdue.length}{' '}
                      {todayViewOverdue.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'}
                    </span>
                    {overdueExpanded ? (
                      <ChevronUp size={14} className="text-red-400" />
                    ) : (
                      <ChevronDown size={14} className="text-red-400" />
                    )}
                  </button>
                  {overdueExpanded && (
                    <TaskList tasks={todayViewOverdue} emptyMessage="" {...callbacks} />
                  )}
                </div>
              )}
              <TaskList
                tasks={todayViewTasks}
                title={todayViewOverdue.length > 0 ? 'Hoje' : undefined}
                emptyMessage={
                  todayViewOverdue.length === 0
                    ? 'Nenhuma tarefa para hoje'
                    : 'Nenhuma tarefa com vencimento hoje'
                }
                {...callbacks}
              />
            </div>
          )}

          {view === 'all' && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {groups.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma tarefa encontrada
                </p>
              ) : (
                groups.map(group => (
                  <div
                    key={group.key}
                    className={
                      group.isOverdue
                        ? 'border-b border-gray-100 bg-red-50'
                        : 'border-b border-gray-100 last:border-0'
                    }
                  >
                    <TaskList
                      tasks={group.tasks}
                      title={group.title}
                      titleClassName={group.isOverdue ? 'bg-red-50 text-red-700' : ''}
                      emptyMessage=""
                      {...callbacks}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <TaskModal
        mode="edit"
        task={editingTask ?? undefined}
        workspaceId={workspaceId}
        open={!!editingTask}
        onOpenChange={open => {
          if (!open) setEditingTask(null)
        }}
        onSuccess={refetch}
      />

      <TaskModal
        mode="create"
        workspaceId={workspaceId}
        defaultContactId={contactId}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={refetch}
      />
    </div>
  )
}
