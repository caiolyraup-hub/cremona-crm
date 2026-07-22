export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-100" />
        <div className="mt-1.5 h-4 w-48 animate-pulse rounded bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="h-1 w-8 animate-pulse rounded-full bg-gray-100" />
              <div className="mt-4 h-3.5 w-24 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
