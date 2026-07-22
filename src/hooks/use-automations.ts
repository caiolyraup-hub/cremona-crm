'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { AutomationLog, AutomationWithStats } from '@/types/app'

export function useAutomations(workspaceId: string, onNewLog?: (log: AutomationLog) => void) {
  const [automations, setAutomations] = useState<AutomationWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase as any)
        .from('automations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (!rows?.length) {
        setAutomations([])
        return
      }

      const ids = rows.map((r: { id: string }) => r.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logs } = await (supabase as any)
        .from('automation_logs')
        .select('*')
        .in('automation_id', ids)
        .order('executed_at', { ascending: false })

      const logRows = (logs ?? []) as AutomationLog[]

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekStartIso = weekStart.toISOString()

      const withStats: AutomationWithStats[] = rows.map((a: AutomationWithStats) => {
        const aLogs = logRows.filter(l => l.automation_id === a.id)
        return {
          ...a,
          log_count: aLogs.length,
          success_count: aLogs.filter(l => l.status === 'success').length,
          week_success_count: aLogs.filter(l => l.status === 'success' && l.executed_at >= weekStartIso).length,
          last_log: aLogs[0] ?? null,
        }
      })

      setAutomations(withStats)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { void fetch() }, [fetch])

  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`automation-logs-${workspaceId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'automation_logs',
        filter: `workspace_id=eq.${workspaceId}`,
      }, (payload) => {
        const log = payload.new as AutomationLog
        onNewLog?.(log)
        if (log.status === 'success') {
          toast.success('Automacao executada', {
            description: 'Mensagem enviada automaticamente',
            duration: 3000,
          })
        }
        void fetch()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetch, onNewLog, workspaceId])

  return { automations, isLoading, refetch: fetch }
}
