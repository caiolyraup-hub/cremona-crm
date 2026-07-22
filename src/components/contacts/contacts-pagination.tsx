'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ContactsPaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  isLoading: boolean
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)

  if (current <= 2) return [0, 1, 2, 3, 4, '...', total - 1]
  if (current >= total - 3) return [0, '...', total - 5, total - 4, total - 3, total - 2, total - 1]
  return [0, '...', current - 1, current, current + 1, '...', total - 1]
}

export function ContactsPagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  isLoading,
}: ContactsPaginationProps) {
  if (totalCount <= pageSize) return null

  const totalPages = Math.ceil(totalCount / pageSize)
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0 || isLoading}
        className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={15} />
        Anterior
      </button>

      <div className="flex items-center gap-1 mx-2">
        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={`h-8 w-8 rounded-md text-sm transition-colors ${
                page === currentPage
                  ? 'bg-[#378ADD] font-medium text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              } disabled:cursor-not-allowed`}
            >
              {page + 1}
            </button>
          )
        )}
      </div>

      <span className="mx-2 text-sm text-gray-400">
        Página {currentPage + 1} de {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1 || isLoading}
        className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Próximo
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
