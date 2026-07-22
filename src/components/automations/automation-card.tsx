'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ChevronRight, LogOut, MoreVertical, UserPlus, Zap, MessageCircle, CheckSquare, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { toggleAutomationAction, deleteAutomationAction } from '@/app/(dashboard)/dashboard/automations/actions'
import type { AutomationWithStats } from '@/types/app'
import type { Tables } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Stage = Tables<'pipeline_stages'>

interface AutomationCardProps {
  automation: AutomationWithStats
  stages: Stage[]
  workspaceId: string
  onEdit: () => void
  onRefetch: () => void
}

const triggerIcons: Record<string, React.ElementType> = {
  stage_enter: Zap,
  stage_exit: LogOut,
  contact_created: UserPlus,
}

const actionIcons: Record<string, React.ElementType> = {
  send_whatsapp_text: MessageCircle,
  send_whatsapp_template: MessageCircle,
  send_whatsapp_media: ImageIcon,
  create_task: CheckSquare,
}

function triggerLabel(automation: AutomationWithStats, stages: Stage[]): string {
  if (automation.trigger_type === 'stage_enter' || automation.trigger_type === 'stage_exit') {
    const stage = stages.find(s => s.id === automation.trigger_config.stage_id)
    const stageName = stage?.name ?? 'etapa'
    return automation.trigger_type === 'stage_enter'
      ? `Entra em ${stageName}`
      : `Sai de ${stageName}`
  }
  if (automation.trigger_type === 'contact_created') return 'Novo contato'
  return automation.trigger_type
}

function actionLabel(automation: AutomationWithStats): string {
  if (automation.action_type === 'send_whatsapp_text') return 'Enviar mensagem'
  if (automation.action_type === 'send_whatsapp_template') return 'Enviar template'
  if (automation.action_type === 'send_whatsapp_media') return 'Enviar midia'
  if (automation.action_type === 'create_task') return 'Criar tarefa'
  return automation.action_type
}

export function AutomationCard({ automation, stages, workspaceId, onEdit, onRefetch }: AutomationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const TriggerIcon = triggerIcons[automation.trigger_type] ?? Zap
  const ActionIcon = actionIcons[automation.action_type] ?? Zap

  function handleToggle() {
    startTransition(async () => {
      const { error } = await toggleAutomationAction(automation.id, !automation.active, workspaceId)
      if (error) toast.error(error)
      else onRefetch()
    })
  }

  function handleDelete() {
    setMenuOpen(false)
    if (!confirm(`Excluir a automação "${automation.name}"?`)) return
    startTransition(async () => {
      const { error } = await deleteAutomationAction(automation.id, workspaceId)
      if (error) toast.error(error)
      else { toast.success('Automação excluída'); onRefetch() }
    })
  }

  const lastExecuted = automation.last_log?.executed_at
    ? formatDistanceToNow(new Date(automation.last_log.executed_at), { locale: ptBR, addSuffix: true })
    : null
  const logsHref = `/dashboard/automations/logs?automation_id=${automation.id}`

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      {/* Header */}
      <div className="flex items-center gap-2">
        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          aria-label={automation.active ? 'Pausar automação' : 'Ativar automação'}
          className={[
            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
            automation.active ? 'bg-blue-600' : 'bg-gray-200',
            isPending ? 'opacity-50' : '',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
              automation.active ? 'translate-x-4' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>

        <span className="flex-1 truncate text-sm font-medium text-gray-900">{automation.name}</span>

        {automation.log_count > 0 && (
          <span className="shrink-0 text-xs text-gray-400">{automation.log_count} execuções</span>
        )}

        {/* More menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <Link
                  href={logsHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Ver logs
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); onEdit() }}
                  className="flex w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trigger → Action */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
          <TriggerIcon size={11} />
          {triggerLabel(automation, stages)}
        </span>

        <ChevronRight size={14} className="shrink-0 text-gray-300" />

        <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
          <ActionIcon size={11} />
          {actionLabel(automation)}
        </span>

        {automation.delay_minutes > 0 && (
          <span className="text-[11px] text-gray-400">
            ⏱ após {automation.delay_minutes} min
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 flex items-center gap-3">
        {automation.log_count > 0 && (
          <Link href={logsHref} className="text-[11px] text-gray-400 hover:text-blue-600">
            {automation.week_success_count > 0 ? (
              <>
                <span className="text-blue-600">{automation.week_success_count} esta semana</span>
                {' · '}
              </>
            ) : null}
            {automation.log_count} total
          </Link>
        )}
        {lastExecuted && (
          <span className="text-[11px] text-gray-400">Última: {lastExecuted}</span>
        )}
        {!automation.active && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            Pausada
          </span>
        )}
      </div>
    </div>
  )
}
