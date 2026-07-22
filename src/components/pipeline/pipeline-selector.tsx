'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { ChevronDown, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Pipeline } from '@/types/app'
import {
  createPipelineAction,
  deletePipelineAction,
  updatePipelineAction,
} from '@/app/(dashboard)/dashboard/pipeline/pipeline-actions'

const PIPELINE_COLORS = [
  '#378ADD',
  '#22C55E',
  '#EF4444',
  '#F97316',
  '#8B5CF6',
  '#14B8A6',
  '#EC4899',
  '#EAB308',
]

interface PipelineSelectorProps {
  pipelines: Pipeline[]
  selectedId: string
  workspaceId: string
  onSelect: (id: string) => void
  onPipelinesChange: (newSelectedId?: string) => void
}

export function PipelineSelector({
  pipelines,
  selectedId,
  workspaceId,
  onSelect,
  onPipelinesChange,
}: PipelineSelectorProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PIPELINE_COLORS[0])
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = pipelines.find(p => p.id === selectedId)

  function handleCreate() {
    if (!newName.trim()) {
      toast.error('Informe um nome para o pipeline')
      return
    }
    startTransition(async () => {
      const result = await createPipelineAction(workspaceId, newName.trim(), newColor)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pipeline criado')
        setCreating(false)
        setNewName('')
        setNewColor(PIPELINE_COLORS[0])
        setOpen(false)
        onPipelinesChange(result.id ?? undefined)
      }
    })
  }

  function handleRename(pipelineId: string) {
    if (!editName.trim()) {
      toast.error('Informe um nome')
      return
    }
    startTransition(async () => {
      const result = await updatePipelineAction(pipelineId, workspaceId, { name: editName.trim() })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pipeline renomeado')
        setEditingId(null)
        onPipelinesChange()
      }
    })
  }

  function handleDelete(pipelineId: string) {
    startTransition(async () => {
      const result = await deletePipelineAction(pipelineId, workspaceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Pipeline excluído')
        setOpen(false)
        const remaining = pipelines.filter(p => p.id !== pipelineId)
        onPipelinesChange(remaining[0]?.id)
      }
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
      >
        {selected && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: selected.color }}
          />
        )}
        <span className="max-w-[140px] truncate">{selected?.name ?? 'Pipeline'}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="py-1">
            {pipelines.map(p => (
              <div key={p.id} className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                {editingId === p.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(p.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 rounded border border-gray-200 px-2 py-0.5 text-sm outline-none focus:border-[#378ADD]"
                    />
                    <button
                      onClick={() => handleRename(p.id)}
                      disabled={isPending}
                      className="text-green-500 hover:text-green-600"
                    >
                      <Check size={13} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { onSelect(p.id); setOpen(false) }}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="flex-1 truncate text-sm text-gray-700">{p.name}</span>
                      {p.id === selectedId && <Check size={13} className="text-[#378ADD]" />}
                    </button>
                    <div className="hidden items-center gap-1 group-hover:flex">
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name) }}
                        className="text-gray-300 hover:text-gray-600"
                      >
                        <Pencil size={12} />
                      </button>
                      {pipelines.length > 1 && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={isPending}
                          className="text-gray-300 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 p-2">
            {creating ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') setCreating(false)
                  }}
                  placeholder="Nome do pipeline"
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#378ADD]"
                />
                <div className="flex flex-wrap gap-1">
                  {PIPELINE_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: newColor === c ? `2px solid ${c}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isPending}
                    className="flex-1 rounded bg-[#378ADD] py-1.5 text-xs font-medium text-white hover:bg-[#2d6bb5] disabled:opacity-50"
                  >
                    {isPending ? 'Criando...' : 'Criar'}
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                <Plus size={13} />
                Novo pipeline
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
