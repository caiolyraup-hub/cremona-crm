'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { updateStagesAction } from '@/app/(dashboard)/dashboard/pipeline/actions'
import type { Tables } from '@/types/database'

const COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#378ADD',
  '#8B5CF6',
  '#EC4899',
]

interface LocalStage {
  uid: string
  id?: string
  name: string
  color: string
  contactCount: number
}

let uidCounter = 0
function nextUid() {
  return `new-${++uidCounter}`
}

interface StageRowProps {
  stage: LocalStage
  onChangeName: (name: string) => void
  onChangeColor: (color: string) => void
  onDelete: () => void
  canDelete: boolean
}

function StageRow({ stage, onChangeName, onChangeColor, onDelete, canDelete }: StageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.uid,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md bg-white px-2 py-2 shadow-sm border border-gray-100">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 touch-none"
        tabIndex={-1}
      >
        <GripVertical size={15} />
      </button>

      {/* Inline color picker */}
      <div className="flex gap-1">
        {COLORS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChangeColor(c)}
            className="h-4 w-4 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              outline: stage.color === c ? `2px solid ${c}` : 'none',
              outlineOffset: 2,
            }}
          />
        ))}
      </div>

      {/* Current color preview */}
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />

      {/* Name */}
      <input
        value={stage.name}
        onChange={e => onChangeName(e.target.value)}
        className="flex-1 rounded border-0 bg-transparent text-sm text-gray-800 outline-none focus:bg-gray-50 focus:px-1 focus:rounded focus:border focus:border-gray-200"
        placeholder="Nome da etapa"
        maxLength={40}
      />

      {/* Contact count badge */}
      {stage.contactCount > 0 && (
        <span className="text-xs text-gray-400">{stage.contactCount}</span>
      )}

      {/* Delete */}
      {canDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="text-gray-300 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

interface StagesConfigModalProps {
  isOpen: boolean
  onClose: () => void
  stages: Tables<'pipeline_stages'>[]
  contactsByStage: Record<string, unknown[]>
  workspaceId: string
  pipelineId: string
  onSaved: () => void
}

export function StagesConfigModal({
  isOpen,
  onClose,
  stages,
  contactsByStage,
  workspaceId,
  pipelineId,
  onSaved,
}: StagesConfigModalProps) {
  const [localStages, setLocalStages] = useState<LocalStage[]>([])
  const [isPending, startTransition] = useTransition()

  // Initialize local state whenever the modal opens (isOpen goes false→true)
  useEffect(() => {
    if (!isOpen) return
    setLocalStages(
      stages.map(s => ({
        uid: s.id,
        id: s.id,
        name: s.name,
        color: s.color,
        contactCount: (contactsByStage[s.id] ?? []).length,
      }))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  function handleOpenChange(open: boolean) {
    if (!open) onClose()
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalStages(prev => {
        const oldIndex = prev.findIndex(s => s.uid === active.id)
        const newIndex = prev.findIndex(s => s.uid === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function addStage() {
    if (localStages.length >= 10) {
      toast.error('Máximo de 10 etapas permitidas')
      return
    }
    setLocalStages(prev => [
      ...prev,
      { uid: nextUid(), name: '', color: COLORS[prev.length % COLORS.length], contactCount: 0 },
    ])
  }

  function updateName(uid: string, name: string) {
    setLocalStages(prev => prev.map(s => (s.uid === uid ? { ...s, name } : s)))
  }

  function updateColor(uid: string, color: string) {
    setLocalStages(prev => prev.map(s => (s.uid === uid ? { ...s, color } : s)))
  }

  function deleteStage(uid: string) {
    setLocalStages(prev => prev.filter(s => s.uid !== uid))
  }

  function handleSave() {
    const trimmed = localStages.map(s => ({ ...s, name: s.name.trim() }))
    const empty = trimmed.find(s => !s.name)
    if (empty) {
      toast.error('Todas as etapas precisam ter um nome')
      return
    }

    startTransition(async () => {
      const result = await updateStagesAction(
        trimmed.map((s, i) => ({ id: s.id, name: s.name, color: s.color, position: i + 1 })),
        workspaceId,
        pipelineId
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Etapas salvas com sucesso')
        onSaved()
        onClose()
      }
    })
  }

  const deletedWithContacts = stages.filter(s => !localStages.find(l => l.id === s.id) && (contactsByStage[s.id] ?? []).length > 0)

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Configurar etapas do pipeline</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {deletedWithContacts.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {deletedWithContacts.length === 1
                ? `1 etapa com contatos será excluída — os contatos ficarão sem estágio.`
                : `${deletedWithContacts.length} etapas com contatos serão excluídas — os contatos ficarão sem estágio.`}
            </p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={localStages.map(s => s.uid)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {localStages.map(stage => (
                  <StageRow
                    key={stage.uid}
                    stage={stage}
                    onChangeName={name => updateName(stage.uid, name)}
                    onChangeColor={color => updateColor(stage.uid, color)}
                    onDelete={() => deleteStage(stage.uid)}
                    canDelete={localStages.length > 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {localStages.length < 10 && (
            <button
              type="button"
              onClick={addStage}
              className="mt-2 flex w-full items-center gap-1.5 rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
            >
              <Plus size={13} />
              Adicionar etapa
            </button>
          )}

          {localStages.length === 10 && (
            <p className="text-center text-xs text-gray-400">Limite de 10 etapas atingido</p>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || localStages.length === 0}
            className="rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Salvando...' : 'Salvar etapas'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
