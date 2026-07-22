export default function PipelineLoading() {
  return (
    <div>
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-4 w-56 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="h-10 w-72 animate-pulse rounded-md bg-gray-100" />
        <div className="h-10 w-28 animate-pulse rounded-md bg-gray-100" />
      </div>

      <div className="flex gap-4 overflow-hidden pb-4">
        {Array.from({ length: 4 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="min-h-[420px] min-w-[280px] rounded-xl border border-gray-200 bg-white p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
              <div className="h-5 w-8 animate-pulse rounded-full bg-gray-100" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="mt-3 h-3 w-16 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
