'use client'

import { useState, useTransition } from 'react'
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
import { GripVertical, Kanban, Plus, Trash2 } from 'lucide-react'
import { updatePipelineStagesAction } from '@/app/onboarding/actions'

const COLORS = ['#94A3B8', '#60A5FA', '#FBBF24', '#F97316', '#22C55E', '#14B8A6', '#8B5CF6', '#EC4899']

interface Stage {
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

function toLocal(stages: Array<{ id?: string; name: string; color: string; position: number }>): Stage[] {
  return stages.map((stage) => ({ uid: stage.id ?? nextUid(), ...stage }))
}

interface StageRowProps {
  stage: Stage
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

      <label
        className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600"
        title="Selecionar cor"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: stage.color }}
        />
        Cor
        <input
          type="color"
          value={stage.color}
          onChange={(e) => onChangeColor(e.target.value)}
          className="sr-only"
        />
      </label>

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

interface StepPipelineProps {
  stages: Array<{ id?: string; name: string; color: string; position: number }>
  onStagesChange: (stages: Array<{ id?: string; name: string; color: string; position: number }>) => void
  onNext: () => void
  onBack: () => void
}

export function StepPipeline({ stages, onStagesChange, onNext, onBack }: StepPipelineProps) {
  const [local, setLocal] = useState<Stage[]>(() =>
    stages.length > 0
      ? toLocal(stages)
      : [
          { uid: nextUid(), name: 'Novo lead', color: '#94A3B8', position: 0 },
          { uid: nextUid(), name: 'Em contato', color: '#60A5FA', position: 1 },
          { uid: nextUid(), name: 'Proposta enviada', color: '#F97316', position: 2 },
          { uid: nextUid(), name: 'Negociacao', color: '#FBBF24', position: 3 },
          { uid: nextUid(), name: 'Fechado', color: '#22C55E', position: 4 },
        ]
  )
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
        return arrayMove(prev, oldIndex, newIndex).map((stage, index) => ({
          ...stage,
          position: index,
        }))
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
    const payload = local.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      position: stage.position,
    }))

    startTransition(async () => {
      await updatePipelineStagesAction(payload)
      onStagesChange(payload)
      onNext()
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Kanban size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Seu pipeline de vendas</h2>
          <p className="text-sm text-gray-500">Arraste para reordenar as etapas</p>
        </div>
      </div>

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

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Preview em tempo real</p>
          <span className="text-xs text-gray-400">{local.length} etapas</span>
        </div>
        <div className="space-y-2">
          {local.map((stage) => (
            <div key={stage.uid} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
              <span className="text-sm text-gray-700">{stage.name || 'Nova etapa'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || local.some((stage) => !stage.name.trim())}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
