'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  ArrowRight,
  CheckSquare,
  DollarSign,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react'
import type { Tables } from '@/types/database'
import { formatRelativeDate } from '@/lib/formatters'
import {
  createNoteAction,
  deleteNoteAction,
} from '@/app/(dashboard)/dashboard/contacts/[id]/actions'

interface ContactTabsProps {
  contactId: string
  workspaceId: string
  activities: Tables<'activities'>[]
}

const ACTIVITY_CONFIG: Record<
  string,
  { icon: React.ElementType; iconColor: string; bgColor: string; label: string }
> = {
  note: { icon: FileText, iconColor: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Nota' },
  call: { icon: Phone, iconColor: 'text-green-600', bgColor: 'bg-green-100', label: 'Ligacao' },
  email: { icon: Mail, iconColor: 'text-blue-600', bgColor: 'bg-blue-100', label: 'E-mail' },
  whatsapp: {
    icon: MessageCircle,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'WhatsApp',
  },
  task: {
    icon: CheckSquare,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Tarefa',
  },
  sale: {
    icon: DollarSign,
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Venda',
  },
  stage_change: {
    icon: ArrowRight,
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Mudanca de estagio',
  },
}

function ActivityItem({
  activity,
  isLast,
}: {
  activity: Tables<'activities'>
  isLast: boolean
}) {
  const config = ACTIVITY_CONFIG[activity.type] ?? ACTIVITY_CONFIG.note
  const Icon = config.icon

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
        >
          <Icon size={14} className={config.iconColor} />
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-gray-100" />}
      </div>
      <div className={`flex-1 pt-0.5 ${isLast ? 'pb-1' : 'pb-5'}`}>
        <span
          className={[
            'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
            config.bgColor,
            config.iconColor,
          ].join(' ')}
        >
          {config.label}
        </span>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{activity.content}</p>
        <p className="mt-0.5 text-xs text-gray-400">{formatRelativeDate(activity.created_at)}</p>
      </div>
    </div>
  )
}

function NoteItem({
  activity,
  onDelete,
  isPending,
}: {
  activity: Tables<'activities'>
  onDelete: (id: string) => void
  isPending: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group relative rounded-lg border border-gray-100 bg-gray-50 p-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className="pr-6 text-sm leading-relaxed text-gray-700">{activity.content}</p>
      <p className="mt-1 text-xs text-gray-400">{formatRelativeDate(activity.created_at)}</p>
      {hovered ? (
        <button
          onClick={() => onDelete(activity.id)}
          disabled={isPending}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-gray-300 transition-colors hover:bg-red-50 hover:text-red-400 disabled:opacity-40"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  )
}

export function ContactTabs({ contactId, workspaceId, activities }: ContactTabsProps) {
  const [activeTab, setActiveTab] = useState<'activities' | 'notes'>('activities')
  const [noteContent, setNoteContent] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const notes = activities.filter((activity) => activity.type === 'note')

  function handleSaveNote() {
    if (!noteContent.trim()) return
    setNoteError(null)

    startTransition(async () => {
      const result = await createNoteAction(contactId, workspaceId, noteContent)
      if (result.error) {
        setNoteError(result.error)
      } else {
        setNoteContent('')
      }
    })
  }

  function handleDeleteNote(activityId: string) {
    startTransition(async () => {
      const result = await deleteNoteAction(activityId, workspaceId, contactId)
      if (result.error) {
        setNoteError(result.error)
      }
    })
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      handleSaveNote()
    }
  }

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [noteContent])

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: 'activities', label: 'Atividades', count: activities.length },
            { key: 'notes', label: 'Notas', count: notes.length },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === key
                ? '-mb-px border-b-2 border-[#378ADD] text-[#378ADD]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {count > 0 ? (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                {count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'activities' ? (
          <div>
            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                Nenhuma atividade registrada ainda.
              </p>
            ) : (
              <div>
                {activities.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={index === activities.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <textarea
                ref={textareaRef}
                value={noteContent}
                onChange={(event) => setNoteContent(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escreva uma nota sobre este contato..."
                rows={3}
                className="w-full resize-none rounded-md border border-gray-200 p-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
              />
              {noteError ? <p className="mt-1 text-xs text-red-500">{noteError}</p> : null}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">Ctrl+Enter para salvar</p>
                  <span
                    className={`text-xs ${
                      noteContent.length > 1800 ? 'text-amber-500' : 'text-gray-400'
                    }`}
                  >
                    {noteContent.length} / 2000
                  </span>
                </div>
                <button
                  onClick={handleSaveNote}
                  disabled={!noteContent.trim() || isPending}
                  className="rounded-md bg-[#378ADD] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isPending ? 'Salvando...' : 'Salvar nota'}
                </button>
              </div>
            </div>

            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">
                Nenhuma nota registrada ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    activity={note}
                    onDelete={handleDeleteNote}
                    isPending={isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
