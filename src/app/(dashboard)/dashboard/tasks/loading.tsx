export default function TasksLoading() {
  return (
    <div>
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-4 w-56 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="h-10 w-80 animate-pulse rounded-md bg-gray-100" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-gray-100" />
        <div className="h-10 w-24 animate-pulse rounded-md bg-gray-100" />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-3 py-2">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 border-b border-gray-100 px-3 py-3 last:border-0"
          >
            <div className="mt-0.5 h-5 w-5 animate-pulse rounded-full bg-gray-100" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
