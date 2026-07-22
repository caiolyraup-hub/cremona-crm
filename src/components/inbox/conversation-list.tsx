'use client'

import { useMemo, useState } from 'react'
import { MessageCircle, Search } from 'lucide-react'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { ConversationEmptyState } from '@/components/inbox/conversation-empty-state'
import { ConversationSkeleton } from '@/components/inbox/conversation-skeleton'
import { formatRelativeDate } from '@/lib/formatters'
import type { InboxConversation } from '@/types/app'

type ConversationListProps = {
  conversations: InboxConversation[]
  selectedId: string | null
  onSelect: (contactId: string) => void
  isLoading: boolean
  unreadCount: number
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  unreadCount,
}: ConversationListProps) {
  const [query, setQuery] = useState('')

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return conversations

    return conversations.filter((conversation) =>
      [conversation.contactName, conversation.contactPhone ?? '', conversation.lastMessage]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    )
  }, [conversations, query])

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">WhatsApp</h1>
            <p className="mt-1 text-xs text-gray-500">Conversas recebidas pelo CRM</p>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
              {unreadCount} nao lida{unreadCount !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className="relative mt-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar conversa"
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ConversationSkeleton />
        ) : filteredConversations.length === 0 ? (
          <ConversationEmptyState
            title="Nenhuma conversa ainda"
            description="As mensagens recebidas pelo WhatsApp aparecerao aqui."
          />
        ) : (
          <div className="p-3">
            {filteredConversations.map((conversation) => {
              const isSelected = conversation.contactId === selectedId

              return (
                <button
                  key={conversation.contactId}
                  type="button"
                  onClick={() => onSelect(conversation.contactId)}
                  className={[
                    'mb-2 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    isSelected
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-transparent hover:bg-gray-50',
                  ].join(' ')}
                >
                  <ContactAvatar name={conversation.contactName} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {conversation.contactName}
                        </p>
                        {conversation.contactPhone ? (
                          <p className="truncate text-xs text-gray-400">
                            {conversation.contactPhone}
                          </p>
                        ) : (
                          <p className="truncate text-xs text-gray-400">Telefone nao informado</p>
                        )}
                      </div>
                      <div className="shrink-0 text-[11px] text-gray-400">
                        {formatRelativeDate(conversation.lastMessageAt)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {conversation.lastMessageDirection === 'inbound' ? 'Recebida' : 'Enviada'}
                      </span>
                      <p className="truncate text-sm text-gray-600">
                        {conversation.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {conversation.unreadCount > 0 ? (
                      <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : (
                      <MessageCircle size={14} className="text-gray-200" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
