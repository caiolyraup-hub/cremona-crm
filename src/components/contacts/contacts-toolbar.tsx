'use client'

import { useRef, useState, useEffect } from 'react'
import { Search, X, Tag, ChevronDown } from 'lucide-react'
import { getTagColor } from '@/lib/formatters'

interface ContactsToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedTags: string[]
  availableTags: string[]
  onTagToggle: (tag: string) => void
  onClearTags: () => void
  totalCount: number
  displayedCount: number
  isLoading: boolean
}

export function ContactsToolbar({
  searchQuery,
  onSearchChange,
  selectedTags,
  availableTags,
  onTagToggle,
  onClearTags,
  totalCount,
  displayedCount,
  isLoading,
}: ContactsToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, e-mail..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="h-9 w-80 rounded-md border border-gray-200 pl-9 pr-8 text-sm outline-none placeholder:text-gray-400 focus:border-[#378ADD] focus:ring-1 focus:ring-[#378ADD]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {availableTags.length > 0 && (
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex h-9 items-center gap-1.5 rounded-md border border-gray-200 px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              <Tag size={14} />
              Etiquetas
              {selectedTags.length > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#378ADD] text-[10px] font-medium text-white">
                  {selectedTags.length}
                </span>
              )}
              <ChevronDown size={13} className="text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 top-10 z-20 min-w-[180px] rounded-md border border-gray-200 bg-white shadow-md">
                <div className="py-1">
                  {availableTags.map(tag => (
                    <label
                      key={tag}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTags.includes(tag)}
                        onChange={() => onTagToggle(tag)}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-[#378ADD]"
                      />
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: getTagColor(tag) }}
                      />
                      <span className="text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <div className="border-t border-gray-100 p-1.5">
                    <button
                      onClick={() => {
                        onClearTags()
                        setDropdownOpen(false)
                      }}
                      className="w-full rounded px-2 py-1 text-left text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLoading && totalCount > 0 && (
        <p className="text-[13px] text-gray-400">
          Mostrando {displayedCount} de {totalCount} contatos
        </p>
      )}
    </div>
  )
}
