'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AutomationLog, AutomationLogStatus } from '@/types/app'

export type AutomationLogWithDetails = AutomationLog & {
  automation_name: string
  contact_name: string | null
  contact_phone: string | null
}

type StatusFilter = 'all' | AutomationLogStatus
const PAGE_SIZE = 20

export function useAutomationLogs(workspaceId: string, automationId?: string) {
  const [logs, setLogs] = useState<AutomationLogWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('automation_logs')
        .select('*, automations!inner(name), contacts(name, phone)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .order('executed_at', { ascending: false })
        .range(from, to)

      if (automationId) query = query.eq('automation_id', automationId)
      if (statusFilter !== 'all') query = query.eq('status', statusFilter)

      const { data, count } = await query

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLogs((data ?? []).map((row: any) => ({
        id: row.id,
        workspace_id: row.workspace_id,
        automation_id: row.automation_id,
        contact_id: row.contact_id,
        status: row.status,
        error_message: row.error_message,
        executed_at: row.executed_at,
        automation_name: row.automations?.name ?? 'Automacao removida',
        contact_name: row.contacts?.name ?? null,
        contact_phone: row.contacts?.phone ?? null,
      })))
      setTotalCount(count ?? 0)
    } finally {
      setIsLoading(false)
    }
  }, [automationId, currentPage, statusFilter, workspaceId])

  useEffect(() => { void fetchLogs() }, [fetchLogs])
  useEffect(() => { setCurrentPage(1) }, [automationId, statusFilter])

  return {
    logs,
    isLoading,
    totalCount,
    statusFilter,
    setStatusFilter: (s: string) => setStatusFilter(s as StatusFilter),
    currentPage,
    setCurrentPage,
    pageSize: PAGE_SIZE,
    refetch: fetchLogs,
  }
}
