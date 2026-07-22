import { MessageCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface ConversationEmptyStateProps {
  title: string
  description: string
}

export function ConversationEmptyState({
  title,
  description,
}: ConversationEmptyStateProps) {
  return (
    <EmptyState
      icon={MessageCircle}
      title={title}
      description={description}
    />
  )
}
