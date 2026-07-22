'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWhatsAppConversationPreview } from '@/lib/whatsapp/format'
import type { InboxConversation, InboxMessage } from '@/types/app'
import type { Tables } from '@/types/database'

type ContactSummary = Pick<
  Tables<'contacts'>,
  'id' | 'workspace_id' | 'name' | 'phone' | 'email' | 'company' | 'tags' | 'deleted_at'
>

function resolvePreview(message: Pick<InboxMessage, 'content' | 'media_type'>): string {
  return buildWhatsAppConversationPreview({
    content: message.content,
    mediaType: message.media_type,
  })
}

function buildConversations(
  messages: InboxMessage[],
  contactsById: Map<string, ContactSummary>
): InboxConversation[] {
  const grouped = new Map<string, InboxConversation>()

  for (const message of messages) {
    if (!message.contact_id) continue

    const contact = contactsById.get(message.contact_id)

    const unreadCount =
      message.direction === 'inbound' && message.status !== 'read' ? 1 : 0
    const contactName = contact?.deleted_at
      ? 'Contato removido'
      : contact?.name ?? 'Contato sem cadastro'
    const contactPhone = contact?.deleted_at ? null : (contact?.phone ?? null)
    const contactCompany = contact?.deleted_at ? null : (contact?.company ?? null)
    const contactEmail = contact?.deleted_at ? null : (contact?.email ?? null)
    const contactTags = contact?.deleted_at ? [] : (contact?.tags ?? [])

    const existing = grouped.get(message.contact_id)

    if (!existing) {
      grouped.set(message.contact_id, {
        contactId: message.contact_id,
        contactName,
        contactPhone,
        contactCompany,
        contactEmail,
        contactTags,
        lastMessage: resolvePreview(message),
        lastMessageAt: message.created_at,
        lastMessageDirection: message.direction,
        unreadCount,
      })
      continue
    }

    existing.unreadCount += unreadCount
  }

  return Array.from(grouped.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export interface UseInboxResult {
  conversations: InboxConversation[]
  isLoading: boolean
  error: string | null
  selectedContactId: string | null
  selectConversation: (contactId: string) => void
  refetch: () => Promise<void>
  unreadCount: number
}

export interface UseConversationResult {
  messages: InboxMessage[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInbox(workspaceId: string): UseInboxResult {
  const [conversations, setConversations] = useState<InboxConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchConversations = useCallback(async () => {
    if (!workspaceId) {
      setConversations([])
      setSelectedContactId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data: messagesRaw, error: messagesError } = await supabaseRef.current
      .from('messages')
      .select('id, workspace_id, contact_id, whatsapp_message_id, direction, content, media_url, media_type, status, created_at')
      .eq('workspace_id', workspaceId)
      .not('contact_id', 'is', null)
      .order('created_at', { ascending: false })

    if (messagesError) {
      setError('Nao foi possivel carregar as conversas do WhatsApp.')
      setConversations([])
      setIsLoading(false)
      return
    }

    const messages = (messagesRaw ?? []) as InboxMessage[]
    const contactIds = Array.from(
      new Set(messages.map((message) => message.contact_id).filter(Boolean))
    ) as string[]

    if (contactIds.length === 0) {
      setConversations([])
      setIsLoading(false)
      return
    }

    const { data: contactsRaw, error: contactsError } = await supabaseRef.current
      .from('contacts')
      .select('id, workspace_id, name, phone, email, company, tags, deleted_at')
      .eq('workspace_id', workspaceId)
      .in('id', contactIds)

    if (contactsError) {
      setError('Nao foi possivel carregar os contatos das conversas.')
      setConversations([])
      setIsLoading(false)
      return
    }

    const contacts = (contactsRaw ?? []) as ContactSummary[]
    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]))
    setConversations(buildConversations(messages, contactsById))
    setIsLoading(false)
  }, [workspaceId])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    setSelectedContactId((current) => {
      if (conversations.length === 0) return null
      if (current && conversations.some((conversation) => conversation.contactId === current)) {
        return current
      }
      return conversations[0].contactId
    })
  }, [conversations])

  useEffect(() => {
    if (!workspaceId) return

    const channel = supabaseRef.current
      .channel(`inbox-conversations-${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `workspace_id=eq.${workspaceId}` },
        () => {
          void fetchConversations()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchConversations, workspaceId])

  const unreadCount = useMemo(
    () => conversations.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    [conversations]
  )

  return {
    conversations,
    isLoading,
    error,
    selectedContactId,
    selectConversation: setSelectedContactId,
    refetch: fetchConversations,
    unreadCount,
  }
}

export function useConversation(
  workspaceId: string,
  contactId: string | null
): UseConversationResult {
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabaseRef = useRef(createClient())

  const fetchMessages = useCallback(async () => {
    if (!workspaceId || !contactId) {
      setMessages([])
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabaseRef.current
      .from('messages')
      .select('id, workspace_id, contact_id, whatsapp_message_id, direction, content, media_url, media_type, status, created_at')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError('Nao foi possivel carregar o historico da conversa.')
      setMessages([])
      setIsLoading(false)
      return
    }

    setMessages((data ?? []) as InboxMessage[])
    setIsLoading(false)
  }, [contactId, workspaceId])

  useEffect(() => {
    void fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!workspaceId || !contactId) return

    const channel = supabaseRef.current
      .channel(`conversation-${workspaceId}-${contactId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `workspace_id=eq.${workspaceId}` },
        (payload) => {
          const next = payload.new as { contact_id?: string } | undefined
          const previous = payload.old as { contact_id?: string } | undefined

          if (next?.contact_id === contactId || previous?.contact_id === contactId) {
            void fetchMessages()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [contactId, fetchMessages, workspaceId])

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
  }
}
