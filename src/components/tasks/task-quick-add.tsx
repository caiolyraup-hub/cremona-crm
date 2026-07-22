'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { createTaskAction } from '@/app/(dashboard)/dashboard/tasks/actions'
import { TaskDatePicker } from '@/components/tasks/task-date-picker'
import type { CreateTaskInput } from '@/types/app'

const PRIORITY_OPTS: { value: CreateTaskInput['priority']; color: string; title: string }[] = [
  { value: 'high', color: 'bg-red-500', title: 'Alta' },
  { value: 'medium', color: 'bg-amber-500', title: 'Media' },
  { value: 'low', color: 'bg-gray-400', title: 'Baixa' },
]

interface ContactOption {
  id: string
  name: string
}

interface TaskQuickAddProps {
  workspaceId: string
  onCreated: () => void
  defaultContactId?: string
}

function resolveMention(
  rawTitle: string,
  contacts: ContactOption[]
): { title: string; contactId?: string; error?: string } {
  const trimmed = rawTitle.trim()
  const mentionMatch = trimmed.match(/(?:^|\s)@(.+)$/)

  if (!mentionMatch) return { title: trimmed }

  const mentionName = mentionMatch[1].trim().toLowerCase()
  const matchedContact =
    contacts.find((contact) => contact.name.toLowerCase() === mentionName) ??
    contacts.find((contact) => contact.name.toLowerCase().startsWith(mentionName))

  if (!matchedContact) {
    return {
      title: trimmed,
      error: `Contato @${mentionMatch[1].trim()} nao encontrado`,
    }
  }

  const cleanTitle = trimmed.replace(/\s*@(.+)$/, '').trim()
  return { title: cleanTitle, contactId: matchedContact.id }
}

export function TaskQuickAdd({ workspaceId, onCreated, defaultContactId }: TaskQuickAddProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<CreateTaskInput['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [hasError, setHasError] = useState(false)
  const [allContacts, setAllContacts] = useState<ContactOption[]>([])
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (defaultContactId) return

    let cancelled = false

    async function loadContacts() {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name')
        .limit(200)

      if (!cancelled) {
        setAllContacts((data ?? []) as ContactOption[])
      }
    }

    void loadContacts()
    return () => {
      cancelled = true
    }
  }, [defaultContactId, workspaceId])

  function triggerError(message?: string) {
    if (message) toast.error(message)
    setHasError(true)
    setTimeout(() => setHasError(false), 1500)
    inputRef.current?.focus()
  }

  function handleSubmit() {
    const mentionResult = resolveMention(title, allContacts)
    const cleanTitle = mentionResult.title.trim()

    if (mentionResult.error) {
      triggerError(mentionResult.error)
      return
    }

    if (cleanTitle.length < 2) {
      triggerError('Titulo deve ter pelo menos 2 caracteres')
      return
    }

    startTransition(async () => {
      const result = await createTaskAction(
        {
          title: cleanTitle,
          priority,
          due_date: dueDate || undefined,
          contact_id: defaultContactId || mentionResult.contactId,
        },
        workspaceId
      )

      if (result.error) {
        triggerError(result.error)
        return
      }

      setTitle('')
      setDueDate('')
      onCreated()
    })
  }

  return (
    <div
      className={`mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm transition-colors ${
        hasError ? 'border-red-400' : 'border-gray-200'
      }`}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && !isPending && handleSubmit()}
        placeholder="Adicionar tarefa... Use @nome para vincular um contato"
        disabled={isPending}
        className="min-w-[220px] flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-50"
      />

      <div className="flex gap-1">
        {PRIORITY_OPTS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => setPriority(option.value)}
            className={`h-4 w-4 rounded-full transition-all ${option.color} ${
              priority === option.value
                ? 'scale-110 ring-2 ring-gray-400 ring-offset-1'
                : 'opacity-40 hover:opacity-80'
            }`}
          />
        ))}
      </div>

      <TaskDatePicker
        value={dueDate}
        onChange={setDueDate}
        placeholder="Selecionar prazo"
        className="shrink-0"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#378ADD] text-white transition-colors hover:bg-[#2d6bb5] disabled:opacity-40"
      >
        {isPending ? (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Plus size={16} />
        )}
      </button>
    </div>
  )
}
