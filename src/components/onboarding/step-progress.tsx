'use client'

interface StepProgressProps {
  currentStep: number
  totalSteps: number
}

const LABELS = ['Negócio', 'Pipeline', 'Contatos', 'WhatsApp', 'Pronto']

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const n = i + 1
          const done = n < currentStep
          const active = n === currentStep
          return (
            <div key={n} className="flex flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                {i > 0 && (
                  <div
                    className="h-0.5 flex-1 transition-colors duration-300"
                    style={{ backgroundColor: done || active ? '#378ADD' : '#e5e7eb' }}
                  />
                )}
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
                  style={{
                    backgroundColor: done ? '#378ADD' : active ? '#378ADD' : '#e5e7eb',
                    color: done || active ? '#fff' : '#9ca3af',
                  }}
                >
                  {done ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    n
                  )}
                </div>
                {i < totalSteps - 1 && (
                  <div
                    className="h-0.5 flex-1 transition-colors duration-300"
                    style={{ backgroundColor: done ? '#378ADD' : '#e5e7eb' }}
                  />
                )}
              </div>
              <span
                className="mt-1.5 text-[11px] font-medium transition-colors duration-300"
                style={{ color: active ? '#378ADD' : done ? '#6b7280' : '#9ca3af' }}
              >
                {LABELS[i]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
