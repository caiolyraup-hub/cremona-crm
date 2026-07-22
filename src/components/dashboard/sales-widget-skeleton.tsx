export function SalesWidgetSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      </div>
      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i}>
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-6 w-28 animate-pulse rounded bg-gray-100" />
              <div className="mt-1.5 h-3 w-12 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
                <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
