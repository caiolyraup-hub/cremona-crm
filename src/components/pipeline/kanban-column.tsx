'use client'

import { useDroppable } from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { KanbanCard } from './kanban-card'
import type { Tables } from '@/types/database'
import type { KanbanContact } from '@/types/app'

interface KanbanColumnProps {
  stage: Tables<'pipeline_stages'> | null
  contacts: KanbanContact[]
  stages: Tables<'pipeline_stages'>[]
  total: number
  totalValue: number
  isOver: boolean
  isDragging: boolean
  showGhost: boolean
  stagesWithAutomations?: Set<string>
  automationSummary?: string | null
  onAddContact: () => void
  onMoveContact: (contactId: string, stageId: string | null) => void
  onCreateTask?: (contactId: string) => void
}

export function KanbanColumn({
  stage,
  contacts,
  stages,
  total,
  totalValue,
  isOver,
  isDragging,
  showGhost,
  stagesWithAutomations,
  automationSummary,
  onAddContact,
  onMoveContact,
  onCreateTask,
}: KanbanColumnProps) {
  const columnId = stage?.id ?? 'unstaged'
  const color = stage?.color ?? '#94a3b8'
  const name = stage?.name ?? 'Sem estágio'

  const { setNodeRef } = useDroppable({
    id: columnId,
    data: { type: 'column', stageId: stage?.id ?? null },
  })

  return (
    <div className="flex w-60 shrink-0 flex-col lg:w-72">
      {/* Header */}
      <div className="mb-2 flex h-12 items-center gap-2 px-1">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-700">{name}</p>
          {totalValue > 0 && (
            <p className="text-xs font-medium text-green-700">{formatCurrency(totalValue)}</p>
          )}
        </div>
        {automationSummary && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-500"
            title={automationSummary}
          >
            <Zap size={9} />
          </span>
        )}
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-600">
          {total}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-lg border-2 p-2 transition-colors duration-150 ${
          isOver ? 'border-[#378ADD] bg-blue-50' : 'border-transparent bg-gray-100'
        }`}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {/* Ghost placeholder shown when the dragged card came from this column */}
        {showGhost && (
          <div className="h-[68px] shrink-0 rounded-lg border-2 border-dashed border-gray-300 bg-white/40" />
        )}

        {isDragging ? (
          // Skip AnimatePresence during drag to avoid framer-motion / dnd-kit conflicts
          contacts.map(contact => (
            <KanbanCard
              key={contact.id}
              contact={contact}
              stages={stages}
              stagesWithAutomations={stagesWithAutomations}
              onMove={onMoveContact}
              onCreateTask={onCreateTask}
            />
          ))
        ) : (
          <AnimatePresence initial={false}>
            {contacts.map(contact => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.14 }}
              >
                <KanbanCard
                  contact={contact}
                  stages={stages}
                  onMove={onMoveContact}
                  onCreateTask={onCreateTask}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        <button
          className="mt-auto flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
          onClick={e => { e.stopPropagation(); onAddContact() }}
        >
          <Plus size={13} />
          Adicionar contato
        </button>
      </div>
    </div>
  )
}
