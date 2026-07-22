'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { KanbanCardOverlay } from './kanban-card'
import type { Tables } from '@/types/database'
import type { KanbanContact } from '@/types/app'

interface KanbanBoardProps {
  stages: Tables<'pipeline_stages'>[]
  contactsByStage: Record<string, KanbanContact[]>
  unstagedContacts: KanbanContact[]
  totalByStage: Record<string, number>
  valueByStage: Record<string, number>
  stagesWithAutomations?: Set<string>
  automationSummaryByStage?: Record<string, string>
  onMoveContact: (contactId: string, newStageId: string | null) => void
  onAddContact: (stageId: string | null) => void
  onCreateTask?: (contactId: string) => void
}

export function KanbanBoard({
  stages,
  contactsByStage,
  unstagedContacts,
  totalByStage,
  valueByStage,
  stagesWithAutomations,
  automationSummaryByStage,
  onMoveContact,
  onAddContact,
  onCreateTask,
}: KanbanBoardProps) {
  const [activeContact, setActiveContact] = useState<KanbanContact | null>(null)
  // undefined = not dragging; null = "Sem estágio"; string = stage id
  const [overColumnId, setOverColumnId] = useState<string | null | undefined>(undefined)
  // Column the drag started from
  const [originColumnId, setOriginColumnId] = useState<string | null | undefined>(undefined)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Restore horizontal scroll position from sessionStorage
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const saved = sessionStorage.getItem('pipeline-scroll')
    if (saved) el.scrollLeft = parseInt(saved, 10)
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) sessionStorage.setItem('pipeline-scroll', String(el.scrollLeft))
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const { displayByStage, displayUnstaged } = useMemo(() => {
    if (!activeContact || overColumnId === undefined) {
      return { displayByStage: contactsByStage, displayUnstaged: unstagedContacts }
    }

    const byStage: Record<string, KanbanContact[]> = {}
    for (const [sid, cs] of Object.entries(contactsByStage)) {
      byStage[sid] = cs.filter(c => c.id !== activeContact.id)
    }
    const unstaged = unstagedContacts.filter(c => c.id !== activeContact.id)

    if (overColumnId === null) {
      return { displayByStage: byStage, displayUnstaged: [activeContact, ...unstaged] }
    }
    if (byStage[overColumnId] !== undefined) {
      return {
        displayByStage: { ...byStage, [overColumnId]: [activeContact, ...byStage[overColumnId]] },
        displayUnstaged: unstaged,
      }
    }
    return { displayByStage: byStage, displayUnstaged: unstaged }
  }, [activeContact, overColumnId, contactsByStage, unstagedContacts])

  function resolveTargetColumn(
    over: DragOverEvent['over'] | DragEndEvent['over']
  ): string | null | undefined {
    if (!over) return undefined

    const overData = over.data.current as { type?: string; stageId?: string | null } | undefined

    if (overData?.type === 'column') {
      return overData.stageId ?? null
    }

    // over is a card — look up in the canonical (unfiltered) state passed as props
    const overId = over.id as string
    if (unstagedContacts.some(c => c.id === overId)) return null
    for (const [stageId, cs] of Object.entries(contactsByStage)) {
      if (cs.some(c => c.id === overId)) return stageId
    }
    return undefined
  }

  function handleDragStart(event: DragStartEvent) {
    const allContacts = [
      ...unstagedContacts,
      ...Object.values(contactsByStage).flat(),
    ]
    const contact = allContacts.find(c => c.id === event.active.id)
    setActiveContact(contact ?? null)
    setOverColumnId(undefined)
    setOriginColumnId(contact?.pipeline_stage_id ?? null)
    document.body.style.cursor = 'grabbing'
  }

  function handleDragOver(event: DragOverEvent) {
    const target = resolveTargetColumn(event.over)
    if (target !== undefined) setOverColumnId(target)
  }

  function resetDragState() {
    setActiveContact(null)
    setOverColumnId(undefined)
    setOriginColumnId(undefined)
    document.body.style.cursor = ''
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragged = activeContact
    resetDragState()

    if (!dragged) return

    const targetStageId = resolveTargetColumn(event.over)
    if (targetStageId === undefined) return
    if (targetStageId === dragged.pipeline_stage_id) return

    onMoveContact(dragged.id, targetStageId)
  }

  function handleDragCancel() {
    resetDragState()
  }

  const isDragging = activeContact !== null

  const showUnstaged =
    unstagedContacts.length > 0 || (activeContact !== null && overColumnId === null)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ height: 'calc(100vh - 220px)' }}
      >
        {showUnstaged && (
          <KanbanColumn
            stage={null}
            contacts={displayUnstaged}
            stages={stages}
            total={unstagedContacts.length}
            totalValue={0}
            isOver={overColumnId === null}
            isDragging={isDragging}
            showGhost={isDragging && originColumnId === null && overColumnId !== null}
            stagesWithAutomations={stagesWithAutomations}
            onAddContact={() => onAddContact(null)}
            onMoveContact={onMoveContact}
            onCreateTask={onCreateTask}
          />
        )}

        {stages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            contacts={displayByStage[stage.id] ?? []}
            stages={stages}
            total={totalByStage[stage.id] ?? 0}
            totalValue={valueByStage[stage.id] ?? 0}
            isOver={overColumnId === stage.id}
            isDragging={isDragging}
            showGhost={isDragging && originColumnId === stage.id && overColumnId !== stage.id}
            stagesWithAutomations={stagesWithAutomations}
            automationSummary={automationSummaryByStage?.[stage.id] ?? null}
            onAddContact={() => onAddContact(stage.id)}
            onMoveContact={onMoveContact}
            onCreateTask={onCreateTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContact && <KanbanCardOverlay contact={activeContact} />}
      </DragOverlay>
    </DndContext>
  )
}
