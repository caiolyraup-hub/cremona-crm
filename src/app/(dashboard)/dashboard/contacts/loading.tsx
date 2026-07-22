export default function ContactsLoading() {
  return (
    <div>
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="h-6 w-28 rounded bg-gray-100 animate-pulse" />
        <div className="mt-1.5 h-4 w-20 rounded bg-gray-100 animate-pulse" />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="h-9 w-80 rounded-md bg-gray-100 animate-pulse" />
        <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
          <div className="h-3 w-64 rounded bg-gray-100 animate-pulse" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-0"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
              <div className="h-2.5 w-28 rounded bg-gray-100 animate-pulse" />
            </div>
            <div className="h-3 w-28 rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-5 w-20 rounded-md bg-gray-100 animate-pulse" />
            <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
