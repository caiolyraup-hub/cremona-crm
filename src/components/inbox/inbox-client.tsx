'use client'

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useInbox } from '@/hooks/use-inbox'
import { useWorkspace } from '@/contexts/workspace-context'
import { ConversationList } from '@/components/inbox/conversation-list'
import { ConversationView } from '@/components/inbox/conversation-view'
import { ContactPanel } from '@/components/inbox/contact-panel'

interface InboxClientProps {
  canSendMessages: boolean
}

function getPanelSessionKey(contactId: string) {
  return `inbox-panel-open:${contactId}`
}

export function InboxClient({ canSendMessages }: InboxClientProps) {
  const workspace = useWorkspace()
  const {
    conversations,
    isLoading,
    error,
    selectedContactId,
    selectConversation,
    unreadCount,
  } = useInbox(workspace.id)
  const [showConversationOnMobile, setShowConversationOnMobile] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  useEffect(() => {
    if (!selectedContactId) {
      setShowConversationOnMobile(false)
      setIsPanelOpen(false)
      return
    }
    // Restore panel state from sessionStorage per conversation
    const stored = sessionStorage.getItem(getPanelSessionKey(selectedContactId))
    setIsPanelOpen(stored === 'true')
  }, [selectedContactId])

  function handleTogglePanel() {
    setIsPanelOpen((prev) => {
      const next = !prev
      if (selectedContactId) {
        sessionStorage.setItem(getPanelSessionKey(selectedContactId), String(next))
      }
      return next
    })
  }

  function handleSelectConversation(contactId: string) {
    selectConversation(contactId)
    setShowConversationOnMobile(true)
  }

  return (
    <div className="flex h-[calc(100vh-8.75rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Conversation list */}
      <div
        className={[
          'w-full md:block md:w-80 md:min-w-80',
          showConversationOnMobile ? 'hidden' : 'block',
        ].join(' ')}
      >
        <ConversationList
          conversations={conversations}
          selectedId={selectedContactId}
          onSelect={handleSelectConversation}
          isLoading={isLoading}
          unreadCount={unreadCount}
        />
      </div>

      {/* Conversation view */}
      <div
        className={[
          'min-w-0 flex-1 md:block',
          showConversationOnMobile ? 'block' : 'hidden',
        ].join(' ')}
      >
        {error ? (
          <div className="flex h-full items-center justify-center bg-gray-50 px-6 text-center">
            <div>
              <AlertCircle size={34} className="mx-auto text-red-300" />
              <h2 className="mt-3 text-base font-medium text-gray-800">
                Nao foi possivel carregar a Inbox
              </h2>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          </div>
        ) : (
          <ConversationView
            workspaceId={workspace.id}
            contactId={selectedContactId}
            canSendMessages={canSendMessages}
            onBack={() => setShowConversationOnMobile(false)}
            showBackButton={showConversationOnMobile}
            isPanelOpen={isPanelOpen}
            onTogglePanel={handleTogglePanel}
          />
        )}
      </div>

      {/* Contact panel — desktop: side column, mobile: overlay */}
      <AnimatePresence>
        {isPanelOpen && selectedContactId ? (
          <>
            {/* Mobile overlay */}
            <div className="fixed inset-0 z-40 md:hidden" onClick={handleTogglePanel} />
            {/* Panel */}
            <div className="fixed right-0 top-0 z-50 h-full md:static md:z-auto">
              <ContactPanel
                contactId={selectedContactId}
                workspaceId={workspace.id}
                onClose={handleTogglePanel}
              />
            </div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
