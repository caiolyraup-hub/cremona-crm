import { Skeleton } from '@/components/ui/skeleton'

interface ConversationSkeletonProps {
  variant?: 'list' | 'view'
}

export function ConversationSkeleton({
  variant = 'list',
}: ConversationSkeletonProps) {
  if (variant === 'view') {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 overflow-hidden p-4">
          <Skeleton className="h-16 w-2/3 rounded-2xl" />
          <div className="flex justify-end">
            <Skeleton className="h-16 w-1/2 rounded-2xl" />
          </div>
          <Skeleton className="h-20 w-3/4 rounded-2xl" />
        </div>
        <div className="border-t border-gray-200 p-4">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  )
}
