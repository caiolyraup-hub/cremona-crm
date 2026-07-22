'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import type { AutomationLogWithDetails } from '@/hooks/use-automation-logs'

type Props = {
  log: AutomationLogWithDetails
  showAutomationName: boolean
}

const statusIcon = {
  success: CheckCircle2,
  failed: XCircle,
  skipped: MinusCircle,
}

const statusClass = {
  success: 'text-green-500',
  failed: 'text-red-500',
  skipped: 'text-gray-400',
}

export function AutomationLogItem({ log, showAutomationName }: Props) {
  const [expanded, setExpanded] = useState(false)
  const StatusIcon = statusIcon[log.status]
  const canExpand = Boolean(log.error_message) && (log.status === 'failed' || log.status === 'skipped')

  return (
    <div className="border-b border-gray-100 px-2 py-3 transition-colors hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <StatusIcon size={16} className={`mt-0.5 shrink-0 ${statusClass[log.status]}`} />
          <div className="min-w-0">
            {log.contact_name && log.contact_id ? (
              <Link href={`/dashboard/contacts/${log.contact_id}`} className="flex min-w-0 items-center gap-1.5">
                <ContactAvatar name={log.contact_name} size="sm" />
                <span className="truncate text-[13px] font-medium text-gray-900 hover:text-blue-600">
                  {log.contact_name}
                </span>
              </Link>
            ) : (
              <p className="text-[13px] text-gray-400">Contato removido</p>
            )}

            <p className="mt-1 truncate text-xs text-gray-400">
              {showAutomationName ? `Automacao: ${log.automation_name} · ` : ''}
              {formatDistanceToNow(new Date(log.executed_at), { locale: ptBR, addSuffix: true })}
            </p>
          </div>
        </div>

        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className={[
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
              log.status === 'failed'
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {log.status === 'failed' ? 'Ver erro' : 'Motivo'}
          </button>
        )}
      </div>

      {expanded && log.error_message && (
        <pre className="mt-2 overflow-x-auto rounded bg-red-50 p-1.5 font-mono text-[11px] text-red-700">
          {log.error_message}
        </pre>
      )}
    </div>
  )
}
