'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateSettingsPipelineStagesAction } from '@/app/(dashboard)/dashboard/settings/actions'

const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#378ADD', '#8B5CF6', '#EC4899']

interface LocalStage {
  uid: string
  id?: string
  name: string
  color: string
  position: number
}

let uidCounter = 0

function nextUid() {
  uidCounter += 1
  return `new-${uidCounter}`
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
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-gray-100 bg-white px-2 py-2 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500"
        tabIndex={-1}
      >
        <GripVertical size={15} />
      </button>
      <div className="flex gap-1">
        {COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChangeColor(color)}
            className="h-4 w-4 rounded-full transition-transform hover:scale-110"
            style={{
              backgroundColor: color,
              outline: stage.color === color ? `2px solid ${color}` : 'none',
              outlineOffset: 2,
            }}
          />
        ))}
      </div>
      <input
        value={stage.name}
        onChange={(e) => onChangeName(e.target.value)}
        placeholder="Nome da etapa"
        className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
      />
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="text-gray-300 transition-colors hover:text-red-400 disabled:opacity-30"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

interface PipelineSettingsProps {
  workspaceId: string
  stages: Array<{ id: string; name: string; color: string; position: number }>
}

export function PipelineSettings({ workspaceId, stages }: PipelineSettingsProps) {
  const router = useRouter()
  const [local, setLocal] = useState<LocalStage[]>(() => stages.map((stage) => ({ uid: stage.id, ...stage })))
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocal((prev) => {
        const oldIndex = prev.findIndex((stage) => stage.uid === active.id)
        const newIndex = prev.findIndex((stage) => stage.uid === over.id)
        return arrayMove(prev, oldIndex, newIndex).map((stage, index) => ({ ...stage, position: index }))
      })
    }
  }

  function addStage() {
    setLocal((prev) => [
      ...prev,
      {
        uid: nextUid(),
        name: '',
        color: COLORS[prev.length % COLORS.length],
        position: prev.length,
      },
    ])
  }

  function handleSave() {
    if (local.some((stage) => !stage.name.trim())) {
      toast.error('Todas as etapas precisam ter um nome')
      return
    }

    const payload = local.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
    }))

    startTransition(async () => {
      const result = await updateSettingsPipelineStagesAction(workspaceId, payload)
      if (result?.error) {
        toast.error(result.error)
      } else {
        router.refresh()
        toast.success('Pipeline atualizado')
      }
    })
  }

  return (
    <div className="max-w-lg">
      <p className="mb-4 text-sm text-gray-500">
        Arraste para reordenar. As etapas definem o funil de conversao.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={local.map((stage) => stage.uid)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {local.map((stage) => (
              <StageRow
                key={stage.uid}
                stage={stage}
                canDelete={local.length > 1}
                onChangeName={(name) =>
                  setLocal((prev) => prev.map((item) => (item.uid === stage.uid ? { ...item, name } : item)))
                }
                onChangeColor={(color) =>
                  setLocal((prev) => prev.map((item) => (item.uid === stage.uid ? { ...item, color } : item)))
                }
                onDelete={() =>
                  setLocal((prev) =>
                    prev
                      .filter((item) => item.uid !== stage.uid)
                      .map((item, index) => ({ ...item, position: index }))
                  )
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addStage}
        className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus size={14} />
        Adicionar etapa
      </button>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar pipeline'}
        </button>
      </div>
    </div>
  )
}
