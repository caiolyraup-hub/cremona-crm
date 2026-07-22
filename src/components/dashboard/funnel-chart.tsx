'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { FunnelStage } from '@/types/app'

interface FunnelChartProps {
  data: FunnelStage[]
  isLoading: boolean
}

function FunnelSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div key={index} className="space-y-1">
          <Skeleton className="h-3 w-24 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 rounded-md" style={{ width: `${70 - index * 10}%` }} />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FunnelChart({ data, isLoading }: FunnelChartProps) {
  if (isLoading) return <FunnelSkeleton />

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">Configure seu pipeline para ver o funil</p>
  }

  const maxCount = Math.max(...data.map(stage => stage.count), 1)

  return (
    <div className="space-y-3">
      {data.map((stage, index) => {
        const barWidth = (stage.count / maxCount) * 100

        return (
          <div key={stage.stageId}>
            <div className="flex items-start gap-3">
              <div className="min-w-[120px] shrink-0">
                <span className="block truncate text-[13px] font-medium text-gray-700">
                  {stage.stageName}
                </span>
                {index > 0 && stage.conversionRate > 0 ? (
                  <span className="text-[11px] text-gray-400">
                    Taxa: {stage.conversionRate.toFixed(0)}% da etapa anterior
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-7 flex-1 overflow-hidden rounded bg-gray-100">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: stage.stageColor || '#378ADD',
                    }}
                  />
                </div>
                <span className="shrink-0 whitespace-nowrap text-[13px] text-gray-600">
                  {stage.count} {stage.count === 1 ? 'contato' : 'contatos'}
                </span>
              </div>
            </div>
            {index < data.length - 1 ? (
              <div className="mt-1 text-center text-xs text-gray-300">|</div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
