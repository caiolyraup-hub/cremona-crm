'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, ArrowLeft, Send, SidebarOpen, SidebarClose } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatPhone } from '@/lib/formatters'
import { useConversation } from '@/hooks/use-inbox'
import { getWhatsAppWindowStatus } from '@/lib/whatsapp/conversation-window'
import {
  markConversationAsReadAction,
  resumeLuccaAction,
  sendWhatsAppMessageAction,
  takeOverLuccaAction,
} from '@/app/(dashboard)/dashboard/inbox/actions'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { ConversationEmptyState } from '@/components/inbox/conversation-empty-state'
import { ConversationSkeleton } from '@/components/inbox/conversation-skeleton'
import { MessageBubble } from '@/components/inbox/message-bubble'
import { TemplatePickerModal } from '@/components/inbox/template-picker-modal'
import { MediaPreviewModal } from '@/components/inbox/media-preview-modal'
import { MediaUploadButton } from '@/components/inbox/media-upload-button'
import type { OutboundMediaType } from '@/lib/whatsapp/media-upload'
import type { InboxMessage } from '@/types/app'
import type { Tables } from '@/types/database'

type ConversationViewProps = {
  workspaceId: string
  contactId: string | null
  canSendMessages: boolean
  onBack?: () => void
  showBackButton?: boolean
  isPanelOpen?: boolean
  onTogglePanel?: () => void
}

type ContactDetails = {
  id: string
  name: string
  phone: string | null
  company: string | null
  email: string | null
} | null

type ContactRow = Pick<Tables<'contacts'>, 'id' | 'name' | 'phone' | 'company' | 'email'>

type MessageGroup = {
  label: string
  messages: InboxMessage[]
}

type PendingMedia = {
  url: string
  mediaType: OutboundMediaType
  filename: string
  previewUrl?: string
}

type LuccaQualification = Pick<
  Tables<'lucca_qualifications'>,
  | 'id'
  | 'status'
  | 'current_step'
  | 'city'
  | 'digital_experience'
  | 'team_size_text'
  | 'summary'
  | 'origin'
  | 'origin_evidence'
  | 'notification_status'
  | 'pause_reason'
  | 'response_sla_breached'
>

const LUCCA_STATUS_LABELS: Record<string, string> = {
  active: 'Lucca atendendo',
  qualified: 'Qualificação concluída',
  awaiting_human: 'Aguardando atendimento humano',
  human_owned: 'Atendimento humano',
  opted_out: 'Mensagens automáticas interrompidas',
  paused: 'Lucca pausado',
  failed: 'Falha na automação',
}

function formatLuccaOrigin(qualification: LuccaQualification): string {
  const origin = qualification.origin && typeof qualification.origin === 'object'
    ? qualification.origin as Record<string, unknown>
    : {}
  if (qualification.origin_evidence === 'twilio_referral') {
    const referral = origin.referral && typeof origin.referral === 'object'
      ? origin.referral as Record<string, unknown>
      : {}
    return [referral.headline, referral.source_id ? `anúncio ${referral.source_id}` : null]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' — ') || 'Anúncio Click to WhatsApp'
  }
  if (qualification.origin_evidence === 'lead_submission') {
    return [origin.utm_source, origin.utm_campaign, origin.utm_content]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' / ') || 'Cadastro ou formulário vinculado'
  }
  return 'Não identificada'
}

function getDateLabel(date: string): string {
  const resolvedDate = new Date(date)
  if (isToday(resolvedDate)) return 'Hoje'
  if (isYesterday(resolvedDate)) return 'Ontem'
  return format(resolvedDate, 'dd MMM', { locale: ptBR })
}

function groupMessagesByDate(messages: InboxMessage[]): MessageGroup[] {
  const groups = new Map<string, InboxMessage[]>()

  for (const message of messages) {
    const key = format(new Date(message.created_at), 'yyyy-MM-dd')
    const current = groups.get(key) ?? []
    current.push(message)
    groups.set(key, current)
  }

  return Array.from(groups.entries()).map(([key, groupedMessages]) => ({
    label: getDateLabel(key),
    messages: groupedMessages,
  }))
}

function buildComposerNotice(params: {
  canSendMessages: boolean
  hasPhone: boolean
  hasWindow: boolean
  hasInboundMessage: boolean
}): {
  title: string
  description: string
  href?: string
  hrefLabel?: string
} | null {
  if (!params.canSendMessages) {
    return {
      title: 'Envio ainda nao configurado',
      description:
        'Voce ja pode receber e organizar mensagens. O envio sera liberado apos configurar sua conta WhatsApp Business.',
      href: '/dashboard/settings?tab=whatsapp',
      hrefLabel: 'Configurar WhatsApp',
    }
  }

  if (!params.hasPhone) {
    return {
      title: 'Contato sem telefone',
      description: 'Este contato nao possui telefone cadastrado.',
      href: '/dashboard/contacts',
      hrefLabel: 'Revisar contatos',
    }
  }

  if (!params.hasWindow) {
    return {
      title: params.hasInboundMessage ? 'Janela de 24h fechada' : 'Sem janela ativa',
      description: params.hasInboundMessage
        ? 'Para enviar nova mensagem ativa, sera necessario usar template aprovado pela Meta.'
        : 'Aguarde uma mensagem do cliente ou use templates quando forem habilitados.',
    }
  }

  return null
}

function resolveLastInboundAt(messages: InboxMessage[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message.direction === 'inbound') {
      return message.created_at
    }
  }

  return null
}

function getWindowHelperText(params: {
  isOpen: boolean
  hasInboundMessage: boolean
  minutesRemaining: number | null
}): string {
  if (params.isOpen) {
    if (params.minutesRemaining !== null && params.minutesRemaining <= 60) {
      return 'A janela expira em menos de 1 hora.'
    }

    return 'Voce pode responder livremente este contato.'
  }

  if (params.hasInboundMessage) {
    return 'Para enviar uma nova mensagem ativa, sera necessario usar um template aprovado pela Meta.'
  }

  return 'Aguarde uma mensagem do cliente ou use templates quando forem habilitados.'
}

export function ConversationView({
  workspaceId,
  contactId,
  canSendMessages,
  onBack,
  showBackButton = false,
  isPanelOpen = false,
  onTogglePanel,
}: ConversationViewProps) {
  const { messages, isLoading, error, refetch } = useConversation(workspaceId, contactId)
  const [contact, setContact] = useState<ContactDetails>(null)
  const [qualification, setQualification] = useState<LuccaQualification | null>(null)
  const [isContactLoading, setIsContactLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [isSending, startSending] = useTransition()
  const [isUpdatingLucca, startUpdatingLucca] = useTransition()
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lastReadSyncRef = useRef<string | null>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const unreadInboundMessages = useMemo(
    () => messages.filter((message) => message.direction === 'inbound' && message.status !== 'read'),
    [messages]
  )
  const unreadSyncKey = useMemo(() => {
    const latestUnread = unreadInboundMessages[unreadInboundMessages.length - 1]
    if (!contactId || !latestUnread) {
      return null
    }

    return `${contactId}:${latestUnread.id}:${unreadInboundMessages.length}`
  }, [contactId, unreadInboundMessages])

  const fetchQualification = useCallback(async () => {
    if (!workspaceId || !contactId) {
      setQualification(null)
      return
    }
    const { data } = await supabase
      .from('lucca_qualifications')
      .select('id, status, current_step, city, digital_experience, team_size_text, summary, origin, origin_evidence, notification_status, pause_reason, response_sla_breached')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .maybeSingle()
    setQualification((data as LuccaQualification | null) ?? null)
  }, [contactId, supabase, workspaceId])

  useEffect(() => {
    void fetchQualification()
    if (!workspaceId || !contactId) return
    const channel = supabase
      .channel(`lucca-qualification-${workspaceId}-${contactId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lucca_qualifications', filter: `workspace_id=eq.${workspaceId}` },
        () => void fetchQualification()
      )
      .subscribe()
    return () => { void channel.unsubscribe() }
  }, [contactId, fetchQualification, supabase, workspaceId])

  useEffect(() => {
    if (!workspaceId || !contactId) {
      setContact(null)
      setIsContactLoading(false)
      return
    }

    const currentContactId = contactId
    let active = true
    setIsContactLoading(true)

    async function fetchContact() {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('id, name, phone, company, email, deleted_at')
        .eq('workspace_id', workspaceId)
        .eq('id', currentContactId)
        .is('deleted_at', null)
        .maybeSingle()

      if (!active) return

      if (fetchError || !data) {
        setContact(null)
      } else {
        const contactData = data as ContactRow
        setContact({
          id: contactData.id,
          name: contactData.name,
          phone: contactData.phone,
          company: contactData.company,
          email: contactData.email,
        })
      }

      setIsContactLoading(false)
    }

    void fetchContact()

    return () => {
      active = false
    }
  }, [contactId, supabase, workspaceId])

  useEffect(() => {
    if (!workspaceId || !contactId || !unreadSyncKey) return
    if (lastReadSyncRef.current === unreadSyncKey) return

    lastReadSyncRef.current = unreadSyncKey

    void markConversationAsReadAction(workspaceId, contactId).then((result) => {
      if (result.error) {
        toast.error(result.error)
      } else {
        void refetch()
        router.refresh()
      }
    })
  }, [contactId, refetch, router, unreadSyncKey, workspaceId])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages])
  const lastInboundAt = useMemo(() => resolveLastInboundAt(messages), [messages])
  const windowStatus = useMemo(() => getWhatsAppWindowStatus(lastInboundAt), [lastInboundAt])
  const hasInboundMessage = Boolean(lastInboundAt)
  const isComposerDisabled = !canSendMessages || !contact?.phone || !windowStatus.isOpen
  const windowHelperText = useMemo(
    () =>
      getWindowHelperText({
        isOpen: windowStatus.isOpen,
        hasInboundMessage,
        minutesRemaining: windowStatus.minutesRemaining,
      }),
    [hasInboundMessage, windowStatus.isOpen, windowStatus.minutesRemaining]
  )
  const showTemplateMock = canSendMessages && !windowStatus.isOpen
  const composerNotice = useMemo(
    () =>
      buildComposerNotice({
        canSendMessages,
        hasPhone: Boolean(contact?.phone),
        hasWindow: windowStatus.isOpen,
        hasInboundMessage,
      }),
    [canSendMessages, contact?.phone, hasInboundMessage, windowStatus.isOpen]
  )

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!isComposerDisabled && !isSending) {
        handleSendMessage()
      }
    }
  }

  function handleSendMessage() {
    if (!contactId) return

    startSending(async () => {
      const result = await sendWhatsAppMessageAction(workspaceId, contactId, draft)

      if (result.error) {
        toast.error(result.error)
        return
      }

      setDraft('')
      await refetch()
      router.refresh()
    })
  }

  function handleLuccaControl(action: 'takeover' | 'resume') {
    if (!contactId) return
    startUpdatingLucca(async () => {
      const result = action === 'takeover'
        ? await takeOverLuccaAction(workspaceId, contactId)
        : await resumeLuccaAction(workspaceId, contactId)
      if (result.error) toast.error(result.error)
      else toast.success(action === 'takeover' ? 'Atendimento assumido. Lucca foi pausado.' : 'Lucca retomado.')
      await fetchQualification()
      router.refresh()
    })
  }

  function handleMediaUploaded(media: PendingMedia & { file?: File }) {
    setPendingMedia({
      url: media.url,
      mediaType: media.mediaType,
      filename: media.filename,
      previewUrl: media.file ? URL.createObjectURL(media.file) : media.previewUrl,
    })
    setIsMediaModalOpen(true)
  }

  if (!contactId) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <ConversationEmptyState
          title="Selecione uma conversa"
          description="Escolha uma conversa na lista para ver o historico de mensagens."
        />
      </div>
    )
  }

  if (isLoading || isContactLoading) {
    return <ConversationSkeleton variant="view" />
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 md:hidden"
            >
              <ArrowLeft size={16} />
            </button>
          ) : null}

          {contact ? (
            <>
              <ContactAvatar name={contact.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {contact.phone ? formatPhone(contact.phone) : 'Telefone nao informado'}
                </p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-900">Contato nao encontrado</p>
              <p className="text-xs text-gray-500">A conversa permanece disponivel no historico.</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {contact ? (
            <Link
              href={`/dashboard/contacts/${contact.id}`}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Ver perfil
            </Link>
          ) : null}
          {onTogglePanel && contactId ? (
            <button
              type="button"
              onClick={onTogglePanel}
              title={isPanelOpen ? 'Fechar painel' : 'Dados do contato'}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              {isPanelOpen ? <SidebarClose size={16} /> : <SidebarOpen size={16} />}
              {!isPanelOpen && <span>Dados</span>}
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {contact?.company ? <span>Empresa: {contact.company}</span> : null}
          {contact?.email ? <span>E-mail: {contact.email}</span> : null}
        </div>
      </div>

      {qualification ? (
        <div className="border-b border-gray-200 bg-white px-4 py-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-blue-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{LUCCA_STATUS_LABELS[qualification.status] ?? qualification.status}</p>
                <p className="mt-0.5 text-xs text-blue-800">
                  Etapa {qualification.current_step}/4 · Aviso ao Caio: {qualification.notification_status}
                  {qualification.response_sla_breached ? ' · SLA de recepção excedido' : ''}
                </p>
              </div>
              {qualification.status === 'active' ? (
                <button
                  type="button"
                  disabled={isUpdatingLucca}
                  onClick={() => handleLuccaControl('takeover')}
                  className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Assumir atendimento
                </button>
              ) : ['awaiting_human', 'human_owned', 'paused'].includes(qualification.status) ? (
                <button
                  type="button"
                  disabled={isUpdatingLucca}
                  onClick={() => handleLuccaControl('resume')}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50"
                >
                  Retomar Lucca
                </button>
              ) : null}
            </div>
            {qualification.summary ? (
              <p className="mt-2 whitespace-pre-line text-xs leading-5 text-blue-900">{qualification.summary}</p>
            ) : (
              <p className="mt-2 text-xs text-blue-800">A qualificação ainda está em andamento.</p>
            )}
            <p className="mt-1 text-xs text-blue-800">Origem: {formatLuccaOrigin(qualification)}</p>
          </div>
        </div>
      ) : null}

      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div
          className={[
            'rounded-xl border px-3 py-3',
            windowStatus.isOpen
              ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
              : hasInboundMessage
                ? 'border-amber-100 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-gray-50 text-gray-700',
          ].join(' ')}
        >
          <p className="text-sm font-medium">
            {windowStatus.isOpen
              ? 'Janela 24h aberta'
              : hasInboundMessage
                ? 'Janela 24h fechada'
                : 'Sem janela ativa'}
          </p>
          <p className="mt-1 text-xs">{windowHelperText}</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {error ? (
          <ConversationEmptyState
            title="Nao foi possivel carregar a conversa"
            description="Tente novamente em alguns instantes."
          />
        ) : messages.length === 0 ? (
          <ConversationEmptyState
            title="Nenhuma mensagem nesta conversa"
            description="As mensagens recebidas para este contato aparecerao aqui."
          />
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group) => (
              <div key={group.label}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400">{group.label}</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="space-y-3">
                  {group.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-4">
        {composerNotice ? (
          <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">{composerNotice.title}</p>
            <p className="mt-1 text-xs text-amber-800">{composerNotice.description}</p>
            {composerNotice.href && composerNotice.hrefLabel ? (
              <Link
                href={composerNotice.href}
                className="mt-2 inline-flex text-xs font-medium text-amber-900 underline"
              >
                {composerNotice.hrefLabel}
              </Link>
            ) : null}
          </div>
        ) : null}

        {showTemplateMock ? (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              <p className="text-[13px] text-amber-900">
                Janela de 24h encerrada. Use um template aprovado para retomar a conversa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Usar template
            </button>
          </div>
        ) : null}

        {contact && isTemplateModalOpen ? (
          <TemplatePickerModal
            contactId={contactId!}
            contactName={contact.name}
            contactPhone={contact.phone}
            contactCompany={contact.company}
            workspaceId={workspaceId}
            open={isTemplateModalOpen}
            onOpenChange={setIsTemplateModalOpen}
            onSuccess={() => void refetch()}
          />
        ) : null}

        {contactId ? (
          <MediaPreviewModal
            open={isMediaModalOpen}
            onOpenChange={setIsMediaModalOpen}
            workspaceId={workspaceId}
            contactId={contactId}
            media={pendingMedia}
            onSuccess={() => void refetch()}
          />
        ) : null}

        <div className="flex items-end gap-3">
          <MediaUploadButton
            workspaceId={workspaceId}
            disabled={isComposerDisabled || isSending}
            onUploaded={handleMediaUploaded}
          />
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isComposerDisabled || isSending}
            rows={1}
            placeholder={
              !canSendMessages
                ? 'Configure o WhatsApp em Configuracoes para enviar mensagens'
                : !contact?.phone
                  ? 'Este contato precisa de um telefone para receber mensagens'
                  : !windowStatus.isOpen
                    ? 'Templates serao habilitados em breve.'
                    : 'Digite sua mensagem'
            }
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="button"
            onClick={handleSendMessage}
            disabled={isComposerDisabled || isSending || !draft.trim()}
            className="flex h-11 min-w-[44px] items-center justify-center rounded-xl bg-blue-600 px-3 text-white transition-colors hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSending ? <span className="text-xs font-medium">Enviando...</span> : <Send size={16} />}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {!canSendMessages
            ? 'Nesta etapa, a Inbox recebe e organiza mensagens. Configure o WhatsApp para liberar o envio.'
            : !windowStatus.isOpen
              ? 'Templates serao habilitados em breve.'
              : 'Pressione Enter para enviar e Shift+Enter para quebrar linha.'}
        </p>
      </div>
    </div>
  )
}
