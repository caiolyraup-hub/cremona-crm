'use client'

type Priority = 'all' | 'high' | 'medium' | 'low'
type View = 'today' | 'all'

interface TasksToolbarProps {
  view: View
  onViewChange: (v: View) => void
  priority: Priority
  onPriorityChange: (p: Priority) => void
  showCompleted: boolean
  onShowCompletedChange: (v: boolean) => void
  totalOpen: number
  totalOverdue: number
  totalCompleted: number
}

const PRIORITY_OPTS: { value: Priority; label: string; dot: string }[] = [
  { value: 'all', label: 'Todas', dot: 'bg-gray-400' },
  { value: 'high', label: 'Alta', dot: 'bg-red-500' },
  { value: 'medium', label: 'Média', dot: 'bg-amber-500' },
  { value: 'low', label: 'Baixa', dot: 'bg-gray-400' },
]

export function TasksToolbar({
  view,
  onViewChange,
  priority,
  onPriorityChange,
  showCompleted,
  onShowCompletedChange,
  totalOpen,
  totalOverdue,
  totalCompleted,
}: TasksToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* View toggle */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {(['today', 'all'] as const).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              view === v
                ? 'bg-white text-[#378ADD] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v === 'today' ? 'Hoje' : 'Todas'}
          </button>
        ))}
      </div>

      {/* Priority filter */}
      <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {PRIORITY_OPTS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onPriorityChange(opt.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-all ${
              priority === opt.value
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${opt.dot}`} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Show completed toggle */}
      <button
        onClick={() => onShowCompletedChange(!showCompleted)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          showCompleted
            ? 'border-[#378ADD] bg-blue-50 text-[#378ADD]'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-700'
        }`}
      >
        <span
          className={`relative h-3.5 w-6 rounded-full transition-colors ${
            showCompleted ? 'bg-[#378ADD]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${
              showCompleted ? 'left-3' : 'left-0.5'
            }`}
          />
        </span>
        Concluídas ({totalCompleted})
      </button>

      {/* Summary */}
      <span className="ml-auto text-[13px] text-gray-400">
        {totalOpen} {totalOpen === 1 ? 'aberta' : 'abertas'}
        {totalOverdue > 0 && (
          <span className="text-red-500">
            {' · '}{totalOverdue} vencida{totalOverdue > 1 ? 's' : ''}
          </span>
        )}
      </span>
    </div>
  )
}
