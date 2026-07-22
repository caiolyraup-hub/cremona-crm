export function TasksWidgetSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
      </div>
      <ul className="divide-y divide-gray-50 px-5 py-2">
        {[0, 1, 2, 3].map(i => (
          <li key={i} className="flex items-start gap-2 py-2">
            <div className="mt-0.5 h-4 w-4 shrink-0 animate-pulse rounded-full bg-gray-100" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
              <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-3 w-10 animate-pulse rounded bg-gray-100" />
          </li>
        ))}
      </ul>
    </div>
  )
}
