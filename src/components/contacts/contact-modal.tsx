'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createContactAction,
  updateContactAction,
} from '@/app/(dashboard)/dashboard/contacts/actions'
import { getTagColor } from '@/lib/formatters'
import type { ContactWithStage } from '@/types/app'
import type { Tables } from '@/types/database'

interface ContactModalProps {
  mode: 'create' | 'edit'
  contact?: ContactWithStage
  stages: Tables<'pipeline_stages'>[]
  availableTags: string[]
  workspaceId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialStageId?: string
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  company: '',
  position: '',
  pipeline_stage_id: 'none',
  tags: [] as string[],
}

function inputClass(extra = '') {
  return `w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD] ${extra}`
}

export function ContactModal({
  mode,
  contact,
  stages,
  availableTags,
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
  initialStageId,
}: ContactModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [isPending, startTransition] = useTransition()
  const nameRef = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && contact) {
      setForm({
        name: contact.name,
        phone: contact.phone ?? '',
        email: contact.email ?? '',
        company: contact.company ?? '',
        position: contact.position ?? '',
        pipeline_stage_id: contact.pipeline_stage_id ?? 'none',
        tags: contact.tags ?? [],
      })
    } else {
      setForm({ ...EMPTY_FORM, pipeline_stage_id: initialStageId ?? 'none' })
    }
    setTagInput('')
    setError(null)
  }, [isOpen, mode, contact, initialStageId])

  // Auto-focus name field when modal opens
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => nameRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [isOpen])

  function isDirty(): boolean {
    if (mode !== 'edit' || !contact) return false
    return (
      form.name !== (contact.name ?? '') ||
      form.phone !== (contact.phone ?? '') ||
      form.email !== (contact.email ?? '') ||
      form.company !== (contact.company ?? '') ||
      form.position !== (contact.position ?? '') ||
      form.pipeline_stage_id !== (contact.pipeline_stage_id ?? 'none') ||
      JSON.stringify(form.tags) !== JSON.stringify(contact.tags ?? [])
    )
  }

  function handleClose() {
    if (isDirty()) {
      setConfirmingClose(true)
      return
    }
    onClose()
  }

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function addTag(tag: string) {
    const t = tag.trim()
    if (!t || form.tags.includes(t)) return
    setForm(prev => ({ ...prev, tags: [...prev.tags, t] }))
    setTagInput('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string) {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      removeTag(form.tags[form.tags.length - 1])
    }
  }

  const suggestions = availableTags.filter(
    t => !form.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())
  )
  const canCreateNew =
    tagInput.trim().length > 0 &&
    !availableTags.map(t => t.toLowerCase()).includes(tagInput.trim().toLowerCase())

  function handleSubmit() {
    setError(null)
    const input = {
      ...form,
      pipeline_stage_id: form.pipeline_stage_id === 'none' ? '' : form.pipeline_stage_id,
    }

    startTransition(async () => {
      if (mode === 'create') {
        const result = await createContactAction(input, workspaceId)
        if (result.error) {
          setError(result.error)
        } else {
          toast.success('Contato criado com sucesso')
          onSuccess?.()
          onClose()
        }
      } else if (contact) {
        const result = await updateContactAction({ ...input, id: contact.id }, workspaceId)
        if (result.error) {
          setError(result.error)
        } else {
          toast.success('Contato atualizado com sucesso')
          onSuccess?.()
          onClose()
        }
      }
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Novo contato' : 'Editar contato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameRef}
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Nome completo"
                className={inputClass()}
              />
            </div>

            {/* Telefone + E-mail */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Telefone</label>
                <input
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="nome@empresa.com"
                  className={inputClass()}
                />
              </div>
            </div>

            {/* Empresa + Cargo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Empresa</label>
                <input
                  value={form.company}
                  onChange={e => setField('company', e.target.value)}
                  placeholder="Nome da empresa"
                  className={inputClass()}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Cargo</label>
                <input
                  value={form.position}
                  onChange={e => setField('position', e.target.value)}
                  placeholder="Ex: Gerente de vendas"
                  className={inputClass()}
                />
              </div>
            </div>

            {/* Estágio */}
            {stages.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Estágio</label>
                <Select
                  value={form.pipeline_stage_id}
                  onValueChange={v => setField('pipeline_stage_id', v ?? 'none')}
                >
                  <SelectTrigger className="w-full border-gray-200 text-sm focus:border-[#378ADD] focus:ring-[#378ADD]">
                    <SelectValue placeholder="Selecione um estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem estágio</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Etiquetas */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Etiquetas</label>
              <div className="relative">
                <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1.5 focus-within:border-[#378ADD] focus-within:ring-1 focus-within:ring-[#378ADD]">
                  {form.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: getTagColor(tag) + '20',
                        color: getTagColor(tag),
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:opacity-70"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={e => {
                      setTagInput(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onKeyDown={handleTagKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={form.tags.length === 0 ? 'Adicionar etiqueta...' : ''}
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>

                {showSuggestions && (suggestions.length > 0 || canCreateNew) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
                    {suggestions.slice(0, 6).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={() => addTag(tag)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: getTagColor(tag) }}
                        />
                        {tag}
                      </button>
                    ))}
                    {canCreateNew && (
                      <button
                        type="button"
                        onMouseDown={() => addTag(tagInput)}
                        className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-1.5 text-left text-sm text-[#378ADD] hover:bg-blue-50"
                      >
                        <Plus size={12} />
                        Criar &quot;{tagInput.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Digite e pressione Enter para adicionar
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name.trim()}
              className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending
                ? mode === 'create'
                  ? 'Criando...'
                  : 'Salvando...'
                : mode === 'create'
                ? 'Criar contato'
                : 'Salvar alterações'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingClose} onOpenChange={setConfirmingClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja descartá-las?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmingClose(false); onClose() }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
