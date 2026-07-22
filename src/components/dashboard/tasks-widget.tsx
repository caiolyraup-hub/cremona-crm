import Link from 'next/link'
import { AlertCircle, CheckSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import {
  addDaysToDateKey,
  formatShortDate,
  getDateKey,
  getTodayDateKey,
  isDateKeyBeforeToday,
  isDateKeyToday,
} from '@/lib/formatters'
import { TasksWidgetCheckbox } from './tasks-widget-checkbox'
import type { Tables } from '@/types/database'

interface TasksWidgetProps {
  workspaceId: string
}

type TaskRow = Tables<'tasks'> & {
  contact: { name: string } | null
}

function getDaysLate(dueDate: string, todayKey: string): number {
  const dueDateKey = getDateKey(dueDate)
  return Math.max(
    1,
    Math.floor(
      (new Date(`${todayKey}T00:00:00`).getTime() -
        new Date(`${dueDateKey}T00:00:00`).getTime()) /
        86400000
    )
  )
}

function DueLabelWidget({ dueDate, todayKey }: { dueDate: string; todayKey: string }) {
  if (isDateKeyBeforeToday(dueDate, todayKey)) {
    const days = getDaysLate(dueDate, todayKey)
    return <span className="text-[11px] text-red-500">{days === 1 ? 'ontem' : `${days}d atrás`}</span>
  }

  if (isDateKeyToday(dueDate, todayKey)) {
    return <span className="text-[11px] font-medium text-blue-600">hoje</span>
  }

  return <span className="text-[11px] text-gray-400">{formatShortDate(dueDate)}</span>
}

export async function TasksWidget({ workspaceId }: TasksWidgetProps) {
  const supabase = await createClient()
  const todayKey = getTodayDateKey()
  const tomorrowKey = addDaysToDateKey(todayKey, 1)
  const nextWeekKey = addDaysToDateKey(todayKey, 7)
  const nextWeekExclusive = addDaysToDateKey(nextWeekKey, 1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [overdueRes, todayRes, upcomingRes] = await Promise.all([
    sb
      .from('tasks')
      .select('*, contact:contacts(name)')
      .eq('workspace_id', workspaceId)
      .is('completed_at', null)
      .lt('due_date', todayKey)
      .order('due_date', { ascending: true })
      .limit(5),
    sb
      .from('tasks')
      .select('*, contact:contacts(name)')
      .eq('workspace_id', workspaceId)
      .is('completed_at', null)
      .gte('due_date', todayKey)
      .lt('due_date', tomorrowKey)
      .order('priority', { ascending: true })
      .limit(5),
    sb
      .from('tasks')
      .select('*, contact:contacts(name)')
      .eq('workspace_id', workspaceId)
      .is('completed_at', null)
      .gte('due_date', tomorrowKey)
      .lt('due_date', nextWeekExclusive)
      .order('due_date', { ascending: true })
      .limit(5),
  ])

  const overdue = (overdueRes.data ?? []) as TaskRow[]
  const todayTasks = (todayRes.data ?? []) as TaskRow[]
  const upcomingTasks = (upcomingRes.data ?? []) as TaskRow[]
  const upcomingCombined = [...todayTasks, ...upcomingTasks].slice(0, 5)
  const totalPending = overdue.length + todayTasks.length + upcomingTasks.length

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-[#378ADD]" />
          <h2 className="text-sm font-semibold text-gray-800">Tarefas</h2>
        </div>
        <Link href="/dashboard/tasks" className="text-xs text-[#378ADD] hover:underline">
          Ver todas
        </Link>
      </div>

      {totalPending === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <CheckSquare size={32} className="mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Nenhuma tarefa pendente</p>
          <p className="mt-1 text-sm text-gray-400">Você está em dia!</p>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <div className="border-b border-gray-100 bg-red-50 px-5 py-3">
              <div className="mb-2 flex items-center gap-1.5">
                <AlertCircle size={13} className="text-red-500" />
                <Link
                  href="/dashboard/tasks?view=all"
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  {overdue.length} {overdue.length === 1 ? 'vencida' : 'vencidas'}
                </Link>
              </div>
              <ul className="space-y-2">
                {overdue.slice(0, 3).map(task => (
                  <li key={task.id} className="flex items-start gap-2">
                    <TasksWidgetCheckbox taskId={task.id} workspaceId={workspaceId} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-700">{task.title}</p>
                      {task.due_date && <DueLabelWidget dueDate={task.due_date} todayKey={todayKey} />}
                    </div>
                  </li>
                ))}
                {overdue.length > 3 && (
                  <li>
                    <Link href="/dashboard/tasks?view=all" className="text-xs text-red-500 hover:underline">
                      Ver todas as vencidas ({overdue.length})
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          {upcomingCombined.length > 0 && (
            <ul className="divide-y divide-gray-50 px-5 py-2">
              {upcomingCombined.map(task => (
                <li key={task.id} className="flex items-start gap-2 py-2">
                  <TasksWidgetCheckbox taskId={task.id} workspaceId={workspaceId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-gray-700">{task.title}</p>
                    {task.contact?.name && (
                      <p className="truncate text-[11px] text-gray-400">{task.contact.name}</p>
                    )}
                  </div>
                  {task.due_date && <DueLabelWidget dueDate={task.due_date} todayKey={todayKey} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
