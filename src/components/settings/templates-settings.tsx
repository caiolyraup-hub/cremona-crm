'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Info, MoreVertical, Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { deleteTemplateAction, syncTemplateStatusAction, updateTemplateStatusAction } from '@/app/(dashboard)/dashboard/settings/template-actions'
import { TemplateModal } from '@/components/settings/template-modal'
import type { Tables } from '@/types/database'

type WaTemplate = Tables<'whatsapp_templates'>

const STATUS_CONFIG = {
  pending:  { label: 'Pendente',  cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Aprovado',  cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-100 text-red-700' },
}

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Utilitário',
  MARKETING: 'Marketing',
  AUTHENTICATION: 'Autenticação',
}

interface TemplatesSettingsProps {
  workspaceId: string
}

export function TemplatesSettings({ workspaceId }: TemplatesSettingsProps) {
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<WaTemplate | undefined>()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
    setTemplates(data ?? [])
    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => { void fetchTemplates() }, [fetchTemplates])

  function handleEdit(tpl: WaTemplate) {
    setMenuOpen(null)
    setEditing(tpl)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditing(undefined)
    setModalOpen(true)
  }

  function handleDelete(tpl: WaTemplate) {
    setMenuOpen(null)
    if (!confirm(`Excluir o template "${tpl.display_name}"?`)) return
    startTransition(async () => {
      const result = await deleteTemplateAction(tpl.id, workspaceId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Template excluído')
      void fetchTemplates()
    })
  }

  function handleSyncStatus(tpl: WaTemplate) {
    setSyncingId(tpl.id)
    startTransition(async () => {
      const result = await syncTemplateStatusAction(tpl.id, workspaceId)
      setSyncingId(null)
      if (result.error) {
        toast.error(result.error)
      } else if (result.newStatus === 'approved') {
        toast.success('Template aprovado! ✓')
        void fetchTemplates()
      } else if (result.newStatus === 'rejected') {
        toast.error('Template rejeitado pela Meta.')
        void fetchTemplates()
      } else {
        toast.info('Template ainda pendente na Meta.')
      }
    })
  }

  function cycleStatus(tpl: WaTemplate) {
    setMenuOpen(null)
    const next: Record<string, 'pending' | 'approved' | 'rejected'> = {
      pending: 'approved',
      approved: 'rejected',
      rejected: 'pending',
    }
    const newStatus = next[tpl.status] ?? 'pending'
    startTransition(async () => {
      const result = await updateTemplateStatusAction(tpl.id, newStatus, workspaceId)
      if (result.error) toast.error(result.error)
      else { toast.success(`Status atualizado para "${STATUS_CONFIG[newStatus]?.label}"`) ; void fetchTemplates() }
    })
  }

  return (
    <div className="space-y-4">
      {/* Info card */}
      <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <div className="text-xs text-blue-800">
          <p>Templates precisam ser aprovados pela Meta antes de serem usados para envios fora da janela de 24h.</p>
          <p className="mt-1">Crie o template no Meta Business Manager com o mesmo nome cadastrado aqui, depois marque como &quot;Aprovado&quot;.</p>
          <Link href="/docs/whatsapp-24h-window-and-templates.md" className="mt-1 inline-block underline">
            Como criar templates na Meta →
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Templates cadastrados</p>
        <button onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800">
          <Plus size={13} />
          Adicionar template
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">Nenhum template cadastrado ainda.</p>
          <button onClick={handleCreate} className="mt-2 text-xs text-blue-600 hover:underline">
            Adicionar primeiro template
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => {
            const statusCfg = STATUS_CONFIG[tpl.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
            const vars: Array<{ label: string }> = tpl.variables ?? []
            const bodyPreview = tpl.body_text.length > 120 ? tpl.body_text.slice(0, 120) + '…' : tpl.body_text

            return (
              <div key={tpl.id} className="rounded-lg border border-gray-200 bg-white p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{tpl.display_name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.cls}`}>
                      {statusCfg.label}
                    </span>
                    {tpl.status === 'pending' && (
                      <button
                        onClick={() => handleSyncStatus(tpl)}
                        disabled={syncingId === tpl.id || isPending}
                        title="Verificar aprovação na Meta"
                        className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RefreshCw size={9} className={syncingId === tpl.id ? 'animate-spin' : ''} />
                        Verificar aprovação
                      </button>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                    </span>
                  </div>

                  <div className="relative shrink-0">
                    <button onClick={() => setMenuOpen(menuOpen === tpl.id ? null : tpl.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100">
                      <MoreVertical size={14} />
                    </button>
                    {menuOpen === tpl.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                          <button onClick={() => handleEdit(tpl)}
                            className="flex w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Editar</button>
                          <button onClick={() => cycleStatus(tpl)} disabled={isPending}
                            className="flex w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                            Marcar como {STATUS_CONFIG[({ pending: 'approved', approved: 'rejected', rejected: 'pending' } as Record<string, keyof typeof STATUS_CONFIG>)[tpl.status] ?? 'pending']?.label}
                          </button>
                          <button onClick={() => handleDelete(tpl)}
                            className="flex w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Excluir</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600">{tpl.name}</code>
                </div>

                <p className="mt-1.5 text-xs italic text-gray-500">{bodyPreview}</p>

                {vars.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-gray-400">Variáveis:</span>
                    {vars.map(v => (
                      <span key={v.label} className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {v.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TemplateModal
        mode={editing ? 'edit' : 'create'}
        template={editing}
        workspaceId={workspaceId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={fetchTemplates}
      />
    </div>
  )
}
