'use client'

import { useRef, useState } from 'react'
import { Search, Tag, X } from 'lucide-react'
import { getTagColor } from '@/lib/formatters'

interface PipelineFiltersProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  allTags: string[]
}

export function PipelineFilters({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagsChange,
  allTags,
}: PipelineFiltersProps) {
  const [tagOpen, setTagOpen] = useState(false)
  const tagBtnRef = useRef<HTMLButtonElement>(null)

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  function clearAll() {
    onSearchChange('')
    onTagsChange([])
  }

  const hasFilters = searchQuery.trim() !== '' || selectedTags.length > 0

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar contato..."
          className="h-8 w-52 rounded-md border border-gray-200 bg-white pl-7 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="relative">
          <button
            ref={tagBtnRef}
            onClick={() => setTagOpen(o => !o)}
            onBlur={() => setTimeout(() => setTagOpen(false), 150)}
            className={`flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors ${
              selectedTags.length > 0
                ? 'border-[#378ADD] bg-blue-50 text-[#378ADD]'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Tag size={12} />
            {selectedTags.length > 0 ? `${selectedTags.length} etiqueta${selectedTags.length > 1 ? 's' : ''}` : 'Etiquetas'}
          </button>

          {tagOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
              {allTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={() => toggleTag(tag)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full transition-all ${
                      selectedTags.includes(tag) ? 'ring-2 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: getTagColor(tag) }}
                  />
                  <span className={selectedTags.includes(tag) ? 'font-medium text-gray-900' : 'text-gray-600'}>
                    {tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active tag chips */}
      {selectedTags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag) }}
        >
          {tag}
          <button onClick={() => toggleTag(tag)} className="hover:opacity-70">
            <X size={10} />
          </button>
        </span>
      ))}

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
