'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { CheckSquare, DollarSign, MoreVertical, ExternalLink, ListTodo, Ban, ShoppingBag, Zap, MessageCircle } from 'lucide-react'
import { getTagColor, formatCurrency } from '@/lib/formatters'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import type { KanbanContact } from '@/types/app'
import type { Tables } from '@/types/database'

function getWhatsAppUrl(phone: string | null): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}`
}

function CardBody({ contact, hasAutomation }: { contact: KanbanContact; hasAutomation?: boolean }) {
  const visibleTags = contact.tags.slice(0, 2)
  const extraTags = contact.tags.length - 2
  const whatsAppUrl = getWhatsAppUrl(contact.phone)

  return (
    <>
      <div className="flex items-start gap-2.5">
        <ContactAvatar name={contact.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{contact.name}</p>
          {contact.company && (
            <p className="truncate text-xs text-gray-400">{contact.company}</p>
          )}
        </div>
        {whatsAppUrl && (
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir WhatsApp de ${contact.name}`}
            title="Abrir WhatsApp"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            <MessageCircle size={14} />
          </a>
        )}
      </div>

      {contact.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleTags.map(tag => (
            <span
              key={tag}
              className="rounded-full px-1.5 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: getTagColor(tag) + '20',
                color: getTagColor(tag),
              }}
            >
              {tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
              +{extraTags}
            </span>
          )}
        </div>
      )}

      {(contact.deal_value !== null || contact.open_task_count > 0 || contact.sales_count > 0 || hasAutomation) && (
        <div className="mt-2 flex items-center gap-2.5 border-t border-gray-50 pt-2">
          {contact.deal_value !== null && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-700">
              <DollarSign size={11} />
              {formatCurrency(contact.deal_value)}
            </span>
          )}
          {contact.sales_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <ShoppingBag size={11} />
              {contact.sales_count}
            </span>
          )}
          {contact.open_task_count > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
              <CheckSquare size={11} />
              {contact.open_task_count}
            </span>
          )}
          {hasAutomation && (
            <span
              className="ml-auto flex items-center gap-1 text-xs text-blue-400"
              title="Automação ativa nesta etapa"
            >
              <Zap size={10} />
            </span>
          )}
        </div>
      )}
    </>
  )
}

interface KanbanCardProps {
  contact: KanbanContact
  stages: Tables<'pipeline_stages'>[]
  stagesWithAutomations?: Set<string>
  onMove: (contactId: string, stageId: string | null) => void
  onCreateTask?: (contactId: string) => void
}

export function KanbanCard({ contact, stages, stagesWithAutomations, onMove, onCreateTask }: KanbanCardProps) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: contact.id,
    data: { type: 'card' },
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [removingConfirm, setRemovingConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const style: React.CSSProperties = transform
    ? { transform: CSS.Translate.toString(transform) }
    : {}

  function openMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(o => !o)
    setRemovingConfirm(false)
  }

  function handleMenuBlur() {
    setTimeout(() => setMenuOpen(false), 150)
  }

  function goToDetail(e: React.MouseEvent) {
    e.stopPropagation()
    router.push(`/dashboard/contacts/${contact.id}`)
  }

  function handleMoveTo(e: React.MouseEvent, stageId: string | null) {
    e.stopPropagation()
    setMenuOpen(false)
    onMove(contact.id, stageId)
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (!removingConfirm) {
      setRemovingConfirm(true)
      return
    }
    setMenuOpen(false)
    setRemovingConfirm(false)
    onMove(contact.id, null)
  }

  function handleCreateTask(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpen(false)
    onCreateTask?.(contact.id)
  }

  const otherStages = stages.filter(s => s.id !== contact.pipeline_stage_id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all duration-150 hover:border-gray-300 hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
      {...attributes}
      {...listeners}
    >
      <CardBody
        contact={contact}
        hasAutomation={contact.pipeline_stage_id ? stagesWithAutomations?.has(contact.pipeline_stage_id) : false}
      />

      {/* Context menu trigger — only visible on hover, not during drag */}
      {!isDragging && (
        <div
          className="absolute right-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={e => e.stopPropagation()}
          ref={menuRef}
          onBlur={handleMenuBlur}
          tabIndex={-1}
        >
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={openMenu}
            className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical size={12} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-50 min-w-[168px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg"
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Ver detalhes */}
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={goToDetail}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <ExternalLink size={13} />
                Ver detalhes
              </button>

              {/* Mover para */}
              {otherStages.length > 0 && (
                <>
                  <div className="my-1 border-t border-gray-100" />
                  <p className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                    Mover para
                  </p>
                  {otherStages.map(stage => (
                    <button
                      key={stage.id}
                      type="button"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => handleMoveTo(e, stage.id)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </button>
                  ))}
                </>
              )}

              {/* Criar tarefa */}
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={handleCreateTask}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <ListTodo size={13} />
                Criar tarefa
              </button>

              {/* Remover do pipeline */}
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onPointerDown={e => e.stopPropagation()}
                onClick={handleRemove}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  removingConfirm ? 'font-medium text-red-600' : 'text-gray-700'
                }`}
              >
                <Ban size={13} />
                {removingConfirm ? 'Confirmar remoção' : 'Remover do pipeline'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function KanbanCardOverlay({ contact }: { contact: KanbanContact }) {
  return (
    <div className="rotate-1 cursor-grabbing rounded-lg border border-gray-300 bg-white p-3 shadow-lg">
      <CardBody contact={contact} />
    </div>
  )
}
