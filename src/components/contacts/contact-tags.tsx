'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { getTagColor } from '@/lib/formatters'
import { updateContactTagsAction } from '@/app/(dashboard)/dashboard/contacts/[id]/actions'

interface ContactTagsProps {
  contactId: string
  workspaceId: string
  tags: string[]
  availableTags: string[]
  onUpdate?: (newTags: string[]) => void
}

export function ContactTags({
  contactId,
  workspaceId,
  tags,
  availableTags,
  onUpdate,
}: ContactTagsProps) {
  const [optimistic, setOptimistic] = useState<string[]>(tags)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep in sync when parent refreshes (RSC revalidation)
  useEffect(() => {
    setOptimistic(tags)
  }, [tags])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
        setQuery('')
      }
    }
    if (popoverOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [popoverOpen])

  function applyUpdate(newTags: string[], previous: string[]) {
    setOptimistic(newTags)
    onUpdate?.(newTags)
    startTransition(async () => {
      const result = await updateContactTagsAction(contactId, workspaceId, newTags)
      if (result.error) {
        toast.error(result.error)
        setOptimistic(previous)
        onUpdate?.(previous)
      }
    })
  }

  function removeTag(tag: string) {
    const previous = optimistic
    applyUpdate(previous.filter(t => t !== tag), previous)
  }

  function addTag(tag: string) {
    const t = tag.trim()
    if (!t || optimistic.includes(t)) return
    const previous = optimistic
    applyUpdate([...previous, t], previous)
    setQuery('')
    setPopoverOpen(false)
  }

  const atLimit = optimistic.length >= 10
  const suggestions = availableTags.filter(
    t => !optimistic.includes(t) && t.toLowerCase().includes(query.toLowerCase())
  )
  const canCreate =
    query.trim().length > 0 &&
    !availableTags.map(t => t.toLowerCase()).includes(query.trim().toLowerCase()) &&
    !optimistic.map(t => t.toLowerCase()).includes(query.trim().toLowerCase())

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {optimistic.length > 0 ? (
        optimistic.map(tag => (
          <span
            key={tag}
            className="group flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: getTagColor(tag) + '20',
              color: getTagColor(tag),
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              disabled={isPending}
              className="opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-30"
              aria-label={`Remover etiqueta ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))
      ) : (
        <span className="text-sm text-gray-300">Sem etiquetas</span>
      )}

      <div ref={popoverRef} className="relative">
        <button
          onClick={() => {
            if (atLimit) return
            setPopoverOpen(prev => {
              if (!prev) setTimeout(() => inputRef.current?.focus(), 40)
              return !prev
            })
          }}
          title={atLimit ? 'Limite de 10 etiquetas atingido' : 'Adicionar etiqueta'}
          disabled={isPending}
          className={`flex h-5 w-5 items-center justify-center rounded-full border border-dashed transition-colors disabled:opacity-40 ${
            atLimit
              ? 'cursor-not-allowed border-gray-200 text-gray-200'
              : 'border-gray-300 text-gray-400 hover:border-[#378ADD] hover:text-[#378ADD]'
          }`}
        >
          <Plus size={11} />
        </button>

        {popoverOpen && !atLimit && (
          <div className="absolute left-0 top-7 z-30 w-52 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
            <div className="p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (suggestions.length > 0) addTag(suggestions[0])
                    else if (canCreate) addTag(query)
                  }
                  if (e.key === 'Escape') {
                    setPopoverOpen(false)
                    setQuery('')
                  }
                }}
                placeholder="Buscar ou criar..."
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs outline-none placeholder:text-gray-400 focus:border-[#378ADD]"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {suggestions.length === 0 && !canCreate && (
                <p className="px-3 py-2 text-xs text-gray-400">
                  {query ? 'Nenhuma etiqueta encontrada' : 'Nenhuma sugestão disponível'}
                </p>
              )}
              {suggestions.map(tag => (
                <button
                  key={tag}
                  onMouseDown={() => addTag(tag)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getTagColor(tag) }}
                  />
                  {tag}
                </button>
              ))}
              {canCreate && (
                <button
                  onMouseDown={() => addTag(query)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[#378ADD] hover:bg-blue-50 ${
                    suggestions.length > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  <Plus size={12} />
                  Criar &quot;{query.trim()}&quot;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
