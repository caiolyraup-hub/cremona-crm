'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, CircleSlash, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/contexts/workspace-context'
import { useAutomationLogs } from '@/hooks/use-automation-logs'
import { AutomationLogItem } from '@/components/automations/automation-log-item'

const FILTERS = [
  { value: 'all', label: 'Todos', icon: null },
  { value: 'success', label: 'Sucesso', icon: Check },
  { value: 'failed', label: 'Falha', icon: X },
  { value: 'skipped', label: 'Ignorado', icon: CircleSlash },
]

export default function AutomationLogsPage() {
  const workspace = useWorkspace()
  const searchParams = useSearchParams()
  const automationId = searchParams.get('automation_id') ?? undefined
  const [automationName, setAutomationName] = useState('')
  const {
    logs,
    isLoading,
    totalCount,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useAutomationLogs(workspace.id, automationId)

  useEffect(() => {
    if (!automationId) {
      setAutomationName('')
      return
    }

    let active = true
    async function fetchAutomationName() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (createClient() as any)
        .from('automations')
        .select('name')
        .eq('workspace_id', workspace.id)
        .eq('id', automationId)
        .maybeSingle()

      if (active) setAutomationName(data?.name ?? 'Automacao')
    }

    void fetchAutomationName()
    return () => { active = false }
  }, [automationId, workspace.id])

  const title = automationId ? `Logs: ${automationName || 'Automacao'}` : 'Historico de automacoes'
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex flex-col gap-5 p-6">
      <Link href="/dashboard/automations" className="text-sm font-medium text-gray-500 hover:text-blue-600">
        ← Automações
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{totalCount} execucoes registradas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(filter => {
          const Icon = filter.icon
          const active = statusFilter === filter.value
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={[
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {Icon ? <Icon size={13} /> : null}
              {filter.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhum log encontrado.</div>
        ) : (
          logs.map(log => (
            <AutomationLogItem
              key={log.id}
              log={log}
              showAutomationName={!automationId}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">{currentPage} / {totalPages}</span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  )
}
