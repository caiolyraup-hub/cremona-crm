'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createTemplateAction, updateTemplateAction } from '@/app/(dashboard)/dashboard/settings/template-actions'
import type { Tables } from '@/types/database'
import type { TemplateVariable } from '@/types/app'

type WaTemplate = Tables<'whatsapp_templates'>

interface TemplateModalProps {
  mode: 'create' | 'edit'
  template?: WaTemplate
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const LANGUAGE_OPTIONS = [
  { value: 'pt_BR', label: 'Português (pt_BR)' },
  { value: 'en_US', label: 'Inglês (en_US)' },
]

const CATEGORY_OPTIONS = [
  { value: 'UTILITY', label: 'Utilitário' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'AUTHENTICATION', label: 'Autenticação' },
]

const CONTACT_VARS = ['{{contact_name}}', '{{contact_phone}}', '{{contact_company}}']

function parseBodyVarIndexes(body: string): number[] {
  const matches = body.matchAll(/\{\{(\d+)\}\}/g)
  return Array.from(new Set(Array.from(matches).map(m => Number(m[1])))).sort((a, b) => a - b)
}

function renderPreview(body: string, vars: TemplateVariable[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
    const v = vars.find(vv => vv.index === Number(n))
    return v?.default || v?.label ? `[${v.default || v.label}]` : `{{${n}}}`
  })
}

export function TemplateModal({ mode, template, workspaceId, open, onOpenChange, onSuccess }: TemplateModalProps) {
  const [isPending, startTransition] = useTransition()
  const [nameError, setNameError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [name, setName] = useState('')
  const [language, setLanguage] = useState('pt_BR')
  const [category, setCategory] = useState('UTILITY')
  const [bodyText, setBodyText] = useState('')
  const [variables, setVariables] = useState<TemplateVariable[]>([])

  // Sync variable fields from body text
  useEffect(() => {
    const indexes = parseBodyVarIndexes(bodyText)
    setVariables(prev => {
      const next: TemplateVariable[] = indexes.map(idx => {
        const existing = prev.find(v => v.index === idx)
        return existing ?? { index: idx, label: '', default: '' }
      })
      return next
    })
  }, [bodyText])

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && template) {
      setDisplayName(template.display_name)
      setName(template.name)
      setLanguage(template.language)
      setCategory(template.category)
      setBodyText(template.body_text)
      setVariables(template.variables ?? [])
    } else {
      setDisplayName('')
      setName('')
      setLanguage('pt_BR')
      setCategory('UTILITY')
      setBodyText('')
      setVariables([])
    }
    setNameError('')
  }, [open, mode, template])

  function handleNameChange(val: string) {
    setName(val)
    if (val && !/^[a-z0-9_]+$/.test(val)) {
      setNameError('Use apenas letras minúsculas, números e underscore')
    } else {
      setNameError('')
    }
  }

  function updateVar(index: number, field: 'label' | 'default', value: string) {
    setVariables(prev => prev.map(v => v.index === index ? { ...v, [field]: value } : v))
  }

  function insertDefaultVar(varStr: string, idx: number) {
    setVariables(prev => prev.map(v => v.index === idx ? { ...v, default: varStr } : v))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (nameError) return
    const payload = { name, display_name: displayName, language, category, body_text: bodyText, variables }
    startTransition(async () => {
      const result = mode === 'create'
        ? await createTemplateAction(payload, workspaceId)
        : await updateTemplateAction(template!.id, payload, workspaceId)
      if (result.error) { toast.error(result.error); return }
      toast.success(mode === 'create' ? 'Template criado' : 'Template atualizado')
      onOpenChange(false)
      onSuccess?.()
    })
  }

  const preview = renderPreview(bodyText, variables)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Novo template' : 'Editar template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Display name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Nome de exibição *</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
              maxLength={100} placeholder="Ex: Follow-up pós-visita" required
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
          </div>

          {/* Name (Meta) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Nome exato na Meta *</label>
            <input type="text" value={name} onChange={e => handleNameChange(e.target.value)}
              maxLength={64} placeholder="Ex: cremona_follow_up" required
              className={`w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none ${nameError ? 'border-red-300' : 'border-gray-200 focus:border-gray-400'}`} />
            {nameError ? (
              <p className="text-xs text-red-600">{nameError}</p>
            ) : (
              <p className="text-[11px] text-gray-400">Apenas letras minúsculas, números e underscore. Ex: follow_up_visita</p>
            )}
          </div>

          {/* Language + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Idioma</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none">
                {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none">
                {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Body text */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">Texto do template *</label>
              <span className="text-[11px] text-gray-400">{bodyText.length} / 1024</span>
            </div>
            <textarea value={bodyText} onChange={e => setBodyText(e.target.value)}
              rows={5} maxLength={1024} required
              placeholder={`Olá {{1}}, tudo bem?\nPassando para avisar sobre {{2}}.`}
              className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
            <p className="text-[11px] text-gray-400">Use {`{{1}}`}, {`{{2}}`}… para variáveis. O número indica a posição do parâmetro.</p>
          </div>

          {/* Variables */}
          {variables.length > 0 && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-700">Variáveis detectadas</p>
              {variables.map(v => (
                <div key={v.index} className="space-y-2">
                  <p className="text-[11px] font-mono font-medium text-gray-500">{`{{${v.index}}}`}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-500">Nome da variável</label>
                      <input type="text" value={v.label}
                        onChange={e => updateVar(v.index, 'label', e.target.value)}
                        placeholder="Ex: Nome do cliente"
                        className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500">Valor padrão</label>
                      <input type="text" value={v.default}
                        onChange={e => updateVar(v.index, 'default', e.target.value)}
                        placeholder="Ex: {{contact_name}}"
                        className="mt-0.5 w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {CONTACT_VARS.map(cv => (
                      <button key={cv} type="button"
                        onClick={() => insertDefaultVar(cv, v.index)}
                        className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 hover:bg-blue-100 hover:text-blue-700">
                        {cv}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {bodyText && (
            <div className="rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-medium text-gray-500">Prévia:</p>
              <p className="whitespace-pre-wrap text-xs text-gray-700">{preview}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || !!nameError}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {isPending ? 'Salvando…' : 'Salvar template'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
