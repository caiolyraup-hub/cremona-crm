'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Monitor, DollarSign, CheckSquare } from 'lucide-react'
import { formatCurrency, getTagColor } from '@/lib/formatters'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import type { Tables } from '@/types/database'
import type { KanbanContact } from '@/types/app'

interface MobileGroupProps {
  name: string
  color: string
  contacts: KanbanContact[]
  totalValue: number
  onAddContact: () => void
}

function MobileGroup({ name, color, contacts, totalValue, onAddContact }: MobileGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const router = useRouter()

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Group header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="flex-1 text-sm font-medium text-gray-800">{name}</span>
        {totalValue > 0 && (
          <span className="text-xs font-medium text-green-700">{formatCurrency(totalValue)}</span>
        )}
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-500">
          {contacts.length}
        </span>
        {expanded ? (
          <ChevronDown size={15} className="text-gray-400" />
        ) : (
          <ChevronRight size={15} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {contacts.map(contact => {
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-gray-50 active:bg-gray-100"
              >
                <ContactAvatar name={contact.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
                  {contact.company && (
                    <p className="truncate text-xs text-gray-400">{contact.company}</p>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {contact.deal_value !== null && (
                    <span className="flex items-center gap-0.5 text-xs font-medium text-green-700">
                      <DollarSign size={10} />
                      {formatCurrency(contact.deal_value)}
                    </span>
                  )}
                  {contact.open_task_count > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <CheckSquare size={10} />
                      {contact.open_task_count}
                    </span>
                  )}
                </div>
              </button>
            )
          })}

          <button
            type="button"
            onClick={onAddContact}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          >
            <Plus size={13} />
            Adicionar contato
          </button>
        </div>
      )}
    </div>
  )
}

interface PipelineMobileProps {
  stages: Tables<'pipeline_stages'>[]
  contactsByStage: Record<string, KanbanContact[]>
  unstagedContacts: KanbanContact[]
  valueByStage: Record<string, number>
  onAddContact: (stageId: string | null) => void
}

export function PipelineMobile({
  stages,
  contactsByStage,
  unstagedContacts,
  valueByStage,
  onAddContact,
}: PipelineMobileProps) {
  return (
    <div className="space-y-3">
      {/* Desktop hint banner */}
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        <Monitor size={13} className="shrink-0" />
        Use em um desktop para arrastar os cards entre etapas
      </div>

      {/* Unstaged group */}
      {unstagedContacts.length > 0 && (
        <MobileGroup
          name="Sem estágio"
          color="#94a3b8"
          contacts={unstagedContacts}
          totalValue={0}
          onAddContact={() => onAddContact(null)}
        />
      )}

      {/* Stage groups */}
      {stages.map(stage => (
        <MobileGroup
          key={stage.id}
          name={stage.name}
          color={stage.color}
          contacts={contactsByStage[stage.id] ?? []}
          totalValue={valueByStage[stage.id] ?? 0}
          onAddContact={() => onAddContact(stage.id)}
        />
      ))}

      {stages.length === 0 && unstagedContacts.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">Nenhum contato no pipeline</p>
      )}
    </div>
  )
}
