'use client'

import { useEffect } from 'react'

export default function DashboardPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard/page error]', error)
  }, [error])

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <p className="text-sm text-gray-500">Algo deu errado ao carregar esta página.</p>
      <button
        onClick={reset}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
      >
        Tentar novamente
      </button>
    </div>
  )
}
