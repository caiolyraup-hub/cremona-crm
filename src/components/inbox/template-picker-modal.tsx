'use client'

import { useEffect, useState, useTransition } from 'react'
import { AlertCircle, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { sendTemplateMessageAction } from '@/app/(dashboard)/dashboard/inbox/actions'
import type { Tables } from '@/types/database'

type WaTemplate = Tables<'whatsapp_templates'>

interface TemplatePickerModalProps {
  contactId: string
  contactName: string
  contactPhone?: string | null
  contactCompany?: string | null
  contactEmail?: string | null
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  UTILITY: 'Utilitário',
  MARKETING: 'Marketing',
  AUTHENTICATION: 'Autenticação',
}

const CATEGORY_COLORS: Record<string, string> = {
  UTILITY: 'bg-gray-100 text-gray-600',
  MARKETING: 'bg-amber-100 text-amber-700',
  AUTHENTICATION: 'bg-blue-100 text-blue-700',
}

function resolveVarDefault(def: string, contact: { name: string; phone?: string | null; company?: string | null; email?: string | null }): string {
  const map: Record<string, string> = {
    contact_name: contact.name,
    contact_phone: contact.phone ?? '',
    contact_company: contact.company ?? '',
    contact_email: contact.email ?? '',
  }
  return def.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => map[k] ?? def)
}

function renderPreview(bodyText: string, values: Record<string, string>): string {
  return bodyText.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => values[n] || `[variável ${n}]`)
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function TemplatePickerModal({
  contactId, contactName, contactPhone, contactCompany, contactEmail,
  workspaceId, open, onOpenChange, onSuccess,
}: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<WaTemplate[] | null>(null)
  const [pendingTemplates, setPendingTemplates] = useState<WaTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const contact = { name: contactName, phone: contactPhone, company: contactCompany, email: contactEmail }

  useEffect(() => {
    if (!open) return
    setIsLoadingTemplates(true)
    setSelectedId(null)
    setValues({})
    setActionError(null)
    setPendingTemplates([])
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase as any)
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'approved')
      .eq('active', true)
      .order('display_name', { ascending: true })
      .then(({ data }: { data: WaTemplate[] | null }) => {
        const approved = data ?? []
        setTemplates(approved)
        if (approved.length === 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          void (supabase as any)
            .from('whatsapp_templates')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'pending')
            .order('display_name', { ascending: true })
            .then(({ data: pending }: { data: WaTemplate[] | null }) => {
              setPendingTemplates(pending ?? [])
            })
        }
        setIsLoadingTemplates(false)
      })
  }, [open, workspaceId])

  function handleSelect(template: WaTemplate) {
    setSelectedId(template.id)
    setActionError(null)
    const vars: Array<{ index: number; default: string }> = template.variables ?? []
    const initial: Record<string, string> = {}
    for (const v of vars) {
      initial[String(v.index)] = resolveVarDefault(v.default ?? '', contact)
    }
    setValues(initial)
  }

  function handleClose() {
    setSelectedId(null)
    setValues({})
    setActionError(null)
    onOpenChange(false)
  }

  function handleSend() {
    if (!selectedId) return
    setActionError(null)
    startTransition(async () => {
      const result = await sendTemplateMessageAction(contactId, workspaceId, selectedId, values)
      if (result.error) { setActionError(result.error); return }
      toast.success(`Template enviado para ${contactName}`)
      handleClose()
      onSuccess?.()
    })
  }

  const selected = templates?.find(t => t.id === selectedId) ?? null
  const selectedVars: Array<{ index: number; label: string; default: string }> = selected?.variables ?? []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar template de mensagem</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-xs text-blue-700">
            Templates precisam ser aprovados pela Meta. Se ainda não tem templates aprovados,{' '}
            <Link href="/dashboard/settings?tab=templates" className="underline" onClick={handleClose}>
              cadastre em Configurações → Templates
            </Link>.
          </p>
        </div>

        {/* Template list */}
        <div className="mt-3 space-y-2">
          {isLoadingTemplates ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))
          ) : templates?.length === 0 ? (
            pendingTemplates.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock size={14} className="shrink-0 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700">Aguardando aprovação da Meta</p>
                </div>
                <div className="space-y-2">
                  {pendingTemplates.map(tpl => (
                    <div key={tpl.id} className="rounded-lg border border-amber-100 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{tpl.display_name}</span>
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          Pendente
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Crie este template no Meta Business Manager com o nome exato:
                      </p>
                      <code className="mt-1 block rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-700">
                        {tpl.name}
                      </code>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/settings?tab=templates"
                  onClick={handleClose}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Gerenciar templates <ExternalLink size={11} />
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
                <p className="text-sm text-gray-500">Nenhum template aprovado ainda.</p>
                <Link
                  href="/dashboard/settings?tab=templates"
                  onClick={handleClose}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  Ir para Configurações <ExternalLink size={11} />
                </Link>
              </div>
            )
          ) : (
            templates?.map(tpl => {
              const isSelected = selectedId === tpl.id
              const vars: Array<{ index: number; label: string }> = tpl.variables ?? []
              const previewText = vars.reduce(
                (acc, v) => acc.replace(`{{${v.index}}}`, `[${v.label}]`),
                tpl.body_text
              )
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelect(tpl)}
                  className={[
                    'w-full rounded-lg border p-3 text-left transition-colors',
                    isSelected ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{tpl.display_name}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[tpl.category] ?? CATEGORY_COLORS.UTILITY}`}>
                      {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                    </span>
                  </div>
                  <p className="mt-1 text-xs italic text-gray-500">{truncate(previewText, 80)}</p>
                </button>
              )
            })
          )}
        </div>

        {/* Variable inputs */}
        {selected && selectedVars.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-700">Preencha as variáveis</p>
            {selectedVars.map(v => (
              <div key={v.index}>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {v.label} <span className="font-mono text-gray-400">{`{{${v.index}}}`}</span>
                </label>
                <input
                  type="text"
                  value={values[String(v.index)] ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [String(v.index)]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
                />
              </div>
            ))}

            {/* Live preview */}
            <div className="rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-medium text-gray-500">Prévia da mensagem:</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">
                {renderPreview(selected.body_text, values)}
              </p>
            </div>
          </div>
        )}

        {actionError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-xs text-red-700">{actionError}</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button type="button" onClick={handleSend}
            disabled={!selectedId || isPending}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
            {isPending ? 'Enviando…' : 'Enviar template'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
