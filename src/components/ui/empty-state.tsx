import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-gray-300" strokeWidth={1.5} />
      <h3 className="mt-3 text-base font-medium text-gray-700">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-400">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
