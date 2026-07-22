'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { completeTaskAction, deleteTaskAction } from '@/app/(dashboard)/dashboard/tasks/actions'
import { getDateKey, getTodayDateKey } from '@/lib/formatters'
import type { TaskWithContact } from '@/types/app'

function priorityOrder(p: string): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2
}

function sortTasks(tasks: TaskWithContact[]): TaskWithContact[] {
  return [...tasks].sort((a, b) => {
    if (!!a.completed_at !== !!b.completed_at) return a.completed_at ? 1 : -1
    if (!a.due_date && !b.due_date) { /* fall through */ }
    else if (!a.due_date) return 1
    else if (!b.due_date) return -1
    else {
      const d = getDateKey(a.due_date).localeCompare(getDateKey(b.due_date))
      if (d !== 0) return d
    }
    const p = priorityOrder(a.priority) - priorityOrder(b.priority)
    if (p !== 0) return p
    return b.created_at.localeCompare(a.created_at)
  })
}

function readStorage<T>(key: string, valid: T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const saved = sessionStorage.getItem(key) as T | null
  return saved && valid.includes(saved) ? saved : fallback
}

function writeStorage(key: string, value: string) {
  if (typeof window !== 'undefined') sessionStorage.setItem(key, value)
}

export interface UseTasksResult {
  tasks: TaskWithContact[]
  todayTasks: TaskWithContact[]
  overdueTasks: TaskWithContact[]
  totalCompleted: number
  isLoading: boolean
  view: 'today' | 'all'
  setView: (v: 'today' | 'all') => void
  priority: 'all' | 'high' | 'medium' | 'low'
  setPriority: (p: 'all' | 'high' | 'medium' | 'low') => void
  showCompleted: boolean
  setShowCompleted: (v: boolean) => void
  completeTask: (id: string) => void
  deleteTask: (id: string) => void
  refetch: () => void
}

export function useTasks(workspaceId: string, contactId?: string): UseTasksResult {
  const [allTasks, setAllTasks] = useState<TaskWithContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const [showCompleted, setShowCompleted] = useState(false)
  const tasksRef = useRef<TaskWithContact[]>([])

  const [view, setViewState] = useState<'today' | 'all'>(() =>
    readStorage('tasks-view', ['today', 'all'] as const, 'today')
  )
  const [priority, setPriorityState] = useState<'all' | 'high' | 'medium' | 'low'>(() =>
    readStorage('tasks-priority', ['all', 'high', 'medium', 'low'] as const, 'all')
  )

  const setView = useCallback((v: 'today' | 'all') => {
    setViewState(v)
    writeStorage('tasks-view', v)
  }, [])

  const setPriority = useCallback((p: 'all' | 'high' | 'medium' | 'low') => {
    setPriorityState(p)
    writeStorage('tasks-priority', p)
  }, [])

  useEffect(() => {
    tasksRef.current = allTasks
  }, [allTasks])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('tasks')
        .select('*, contact:contacts(id, name, phone, company)')
        .eq('workspace_id', workspaceId)

      if (contactId) query = query.eq('contact_id', contactId)

      const { data } = await query

      if (cancelled) return

      setAllTasks(sortTasks((data ?? []) as TaskWithContact[]))
      setIsLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [workspaceId, contactId, fetchTrigger])

  const todayStr = useMemo(() => getTodayDateKey(), [])

  const todayTasks = useMemo(
    () => allTasks.filter(t => !t.completed_at && getDateKey(t.due_date) === todayStr),
    [allTasks, todayStr]
  )

  const overdueTasks = useMemo(
    () => allTasks.filter(t => !t.completed_at && !!t.due_date && getDateKey(t.due_date) < todayStr),
    [allTasks, todayStr]
  )

  const totalCompleted = useMemo(
    () => allTasks.filter(t => !!t.completed_at).length,
    [allTasks]
  )

  const tasks = useMemo(() => {
    let result = allTasks
    if (!showCompleted) result = result.filter(t => !t.completed_at)
    if (priority !== 'all') result = result.filter(t => t.priority === priority)
    return result
  }, [allTasks, showCompleted, priority])

  const completeTask = useCallback(
    (id: string) => {
      const previous = tasksRef.current
      const task = previous.find(t => t.id === id)
      if (!task) return

      const nowIso = new Date().toISOString()
      const newCompleted = task.completed_at ? null : nowIso

      setAllTasks(prev =>
        sortTasks(prev.map(t => t.id === id ? { ...t, completed_at: newCompleted } : t))
      )

      completeTaskAction(id, workspaceId).then(result => {
        if (result.error) {
          toast.error(result.error)
          setAllTasks(previous)
        }
      })
    },
    [workspaceId]
  )

  const deleteTask = useCallback(
    (id: string) => {
      const previous = tasksRef.current
      setAllTasks(prev => prev.filter(t => t.id !== id))

      deleteTaskAction(id, workspaceId).then(result => {
        if (result.error) {
          toast.error(result.error)
          setAllTasks(previous)
        }
      })
    },
    [workspaceId]
  )

  const refetch = useCallback(() => setFetchTrigger(n => n + 1), [])

  return {
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
  }
}
