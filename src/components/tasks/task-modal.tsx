'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Check, ChevronDown, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from '@/app/(dashboard)/dashboard/tasks/actions'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaskDatePicker } from '@/components/tasks/task-date-picker'
import { TaskPriorityBadge } from '@/components/tasks/task-priority-badge'
import { getDateKey } from '@/lib/formatters'
import type { CreateTaskInput, TaskWithContact } from '@/types/app'

interface ContactOption {
  id: string
  name: string
  company: string | null
}

export interface TaskModalProps {
  mode: 'create' | 'edit'
  task?: TaskWithContact
  workspaceId: string
  defaultContactId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Priority = 'high' | 'medium' | 'low'

const PRIORITY_KEYS: Priority[] = ['high', 'medium', 'low']

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium' as Priority,
  due_date: '',
  contact_id: '',
}

export function TaskModal({
  mode,
  task,
  workspaceId,
  defaultContactId,
  open,
  onOpenChange,
  onSuccess,
}: TaskModalProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [allContacts, setAllContacts] = useState<ContactOption[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [filteredContacts, setFilteredContacts] = useState<ContactOption[]>([])
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<ContactOption | null>(null)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    setError(null)
    setDeleteConfirm(false)
    setPriorityOpen(false)
    setContactDropdownOpen(false)

    if (mode === 'edit' && task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        priority: (task.priority as Priority) ?? 'medium',
        due_date: getDateKey(task.due_date),
        contact_id: task.contact_id ?? '',
      })

      if (task.contact) {
        setSelectedContact({
          id: task.contact.id,
          name: task.contact.name,
          company: task.contact.company,
        })
        setContactSearch(task.contact.name)
      } else {
        setSelectedContact(null)
        setContactSearch('')
      }
    } else {
      setForm({ ...EMPTY_FORM, contact_id: defaultContactId ?? '' })
      setSelectedContact(null)
      setContactSearch('')
    }
  }, [defaultContactId, mode, open, task])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => titleRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return

    async function loadContacts() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, name, company')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name')
        .limit(200)

      const loadedContacts = (data ?? []) as ContactOption[]
      setAllContacts(loadedContacts)
      setFilteredContacts(loadedContacts)
    }

    void loadContacts()
  }, [open, workspaceId])

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalizedQuery = contactSearch.toLowerCase().trim()

      if (!normalizedQuery) {
        setFilteredContacts(allContacts)
        return
      }

      setFilteredContacts(
        allContacts.filter(
          (contact) =>
            contact.name.toLowerCase().includes(normalizedQuery) ||
            (contact.company?.toLowerCase() ?? '').includes(normalizedQuery)
        )
      )
    }, 200)

    return () => clearTimeout(timer)
  }, [allContacts, contactSearch])

  function selectContact(contact: ContactOption | null) {
    setSelectedContact(contact)
    setForm((previous) => ({ ...previous, contact_id: contact?.id ?? '' }))
    setContactSearch(contact?.name ?? '')
    setContactDropdownOpen(false)
  }

  function handleClose() {
    setDeleteConfirm(false)
    onOpenChange(false)
  }

  function handleSubmit() {
    setError(null)
    const title = form.title.trim()

    if (title.length < 2) {
      setError('Titulo deve ter pelo menos 2 caracteres')
      titleRef.current?.focus()
      return
    }

    startTransition(async () => {
      const payload: CreateTaskInput = {
        title,
        priority: form.priority,
        due_date: form.due_date || undefined,
        contact_id: form.contact_id || undefined,
        description: form.description || undefined,
      }

      if (mode === 'create') {
        const result = await createTaskAction(payload, workspaceId)
        if (result.error) {
          setError(result.error)
          return
        }
        toast.success('Tarefa criada com sucesso')
      } else if (task) {
        const result = await updateTaskAction(task.id, payload, workspaceId)
        if (result.error) {
          setError(result.error)
          return
        }
        toast.success('Tarefa atualizada com sucesso')
      }

      onSuccess?.()
      onOpenChange(false)
    })
  }

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }

    startTransition(async () => {
      const result = await deleteTaskAction(task!.id, workspaceId)
      if (result.error) {
        setError(result.error)
        return
      }

      toast.success('Tarefa excluida')
      onSuccess?.()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova tarefa' : 'Editar tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <div className="flex items-start gap-2">
              <input
                ref={titleRef}
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    handleSubmit()
                  }
                }}
                placeholder="Titulo da tarefa"
                maxLength={200}
                className="w-full text-base font-medium text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400"
              />
              <span className="shrink-0 pt-0.5 text-xs text-gray-400">{form.title.length}/200</span>
            </div>
            {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
          </div>

          <div>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, description: event.target.value }))
              }
              placeholder="Adicionar descricao ou observacoes..."
              rows={3}
              maxLength={1000}
              className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
            />
            <p className="mt-0.5 text-right text-xs text-gray-400">{form.description.length}/1000</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative" onBlur={() => setTimeout(() => setPriorityOpen(false), 150)}>
              <button
                type="button"
                onClick={() => setPriorityOpen((open) => !open)}
                className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <TaskPriorityBadge priority={form.priority} />
                <ChevronDown size={12} className="text-gray-400" />
              </button>

              {priorityOpen ? (
                <div className="absolute left-0 top-10 z-50 min-w-[120px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {PRIORITY_KEYS.map((priorityKey) => (
                    <button
                      key={priorityKey}
                      type="button"
                      onMouseDown={() => {
                        setForm((previous) => ({ ...previous, priority: priorityKey }))
                        setPriorityOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                        form.priority === priorityKey ? 'font-medium text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      <TaskPriorityBadge priority={priorityKey} />
                      {form.priority === priorityKey ? (
                        <Check size={12} className="ml-auto text-[#378ADD]" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <TaskDatePicker
              value={form.due_date}
              onChange={(nextValue) => setForm((previous) => ({ ...previous, due_date: nextValue }))}
              placeholder="Selecionar prazo"
            />

            {!defaultContactId ? (
              <div
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setContactDropdownOpen(false)
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setContactDropdownOpen((open) => !open)}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                    selectedContact
                      ? 'border-gray-300 bg-gray-50 text-gray-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <User size={13} />
                  <span className="max-w-[120px] truncate">
                    {selectedContact ? selectedContact.name : 'Contato'}
                  </span>
                  <ChevronDown size={12} className="text-gray-400" />
                </button>

                {contactDropdownOpen ? (
                  <div className="absolute left-0 top-10 z-50 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="p-2">
                      <input
                        type="text"
                        value={contactSearch}
                        onChange={(event) => setContactSearch(event.target.value)}
                        placeholder="Buscar contato..."
                        autoFocus
                        className="w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-[#378ADD]"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onMouseDown={() => selectContact(null)}
                        className="flex w-full items-center px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
                      >
                        Nenhum contato
                      </button>

                      {filteredContacts.slice(0, 20).map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onMouseDown={() => selectContact(contact)}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 ${
                            selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <ContactAvatar name={contact.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm text-gray-800">{contact.name}</p>
                            {contact.company ? (
                              <p className="truncate text-xs text-gray-400">{contact.company}</p>
                            ) : null}
                          </div>
                        </button>
                      ))}

                      {filteredContacts.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-gray-400">Nenhum resultado</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-400">
              <User size={13} />
              Voce
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className={`mr-auto flex items-center gap-1.5 text-sm transition-colors disabled:opacity-40 ${
                deleteConfirm ? 'font-medium text-red-700' : 'text-red-500 hover:text-red-700'
              }`}
            >
              <Trash2 size={14} />
              {deleteConfirm ? 'Confirmar exclusao' : 'Excluir tarefa'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !form.title.trim()}
            className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending
              ? mode === 'create'
                ? 'Criando...'
                : 'Salvando...'
              : mode === 'create'
                ? 'Criar tarefa'
                : 'Salvar alteracoes'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
