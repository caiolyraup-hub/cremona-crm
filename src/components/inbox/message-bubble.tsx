'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Download, FileText, ImageIcon, MapPin, Mic, Play, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { describeWhatsAppMedia } from '@/lib/whatsapp/format'
import type { InboxMessage } from '@/types/app'

interface MessageBubbleProps {
  message: InboxMessage
}

function resolveMediaIcon(mediaType: string | null) {
  if (mediaType === 'image') return ImageIcon
  if (mediaType === 'audio') return Mic
  if (mediaType === 'document') return FileText
  if (mediaType === 'video') return Play
  if (mediaType === 'location') return MapPin
  return null
}

function resolveStatusLabel(status: string): { label: string; tone: string } | null {
  if (status === 'sent') return { label: 'Enviada', tone: 'text-blue-100' }
  if (status === 'delivered') return { label: 'Entregue', tone: 'text-blue-100' }
  if (status === 'read') return { label: 'Lida', tone: 'text-blue-100' }
  if (status === 'failed') return { label: 'Falhou', tone: 'text-red-200' }
  return null
}

function resolveDocExtensionBadge(content: string | null): { label: string; color: string } | null {
  if (!content) return null
  const ext = content.split('.').pop()?.toLowerCase()
  if (!ext || ext === content.toLowerCase()) return null
  if (ext === 'pdf') return { label: 'PDF', color: 'bg-red-100 text-red-700' }
  if (['xlsx', 'xls'].includes(ext)) return { label: ext.toUpperCase(), color: 'bg-green-100 text-green-700' }
  if (['docx', 'doc'].includes(ext)) return { label: ext.toUpperCase(), color: 'bg-blue-100 text-blue-700' }
  return { label: ext.toUpperCase(), color: 'bg-gray-100 text-gray-600' }
}

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.15 }}
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        />
        <div className="absolute right-2 top-2 flex gap-2">
          <a
            href={src}
            download
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={14} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const isInbound = message.direction === 'inbound'
  const mediaLabel = describeWhatsAppMedia(message.media_type)
  const MediaIcon = resolveMediaIcon(message.media_type)
  const timeLabel = format(new Date(message.created_at), 'HH:mm')
  const statusMeta = resolveStatusLabel(message.status)
  const content = message.content?.trim() ?? ''

  const isImage = message.media_type === 'image'
  const hasRealImage = isImage && Boolean(message.media_url)
  const showPlainText = !isImage && message.media_type === 'text' && Boolean(content)

  return (
    <>
      <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
        <div
          className={[
            'max-w-[85%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[70%]',
            isInbound
              ? 'rounded-tl-none border border-gray-200 bg-white text-gray-800'
              : 'rounded-tr-none bg-blue-600 text-white',
          ].join(' ')}
        >
          {/* ── Image with real preview ── */}
          {isImage ? (
            hasRealImage ? (
              <div
                className="cursor-pointer overflow-hidden rounded-lg"
                style={{ maxWidth: 240 }}
                onClick={() => setLightboxOpen(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.media_url!}
                  alt={content || 'Imagem'}
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: 300 }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                {content ? (
                  <p
                    className={['mt-1 text-xs', isInbound ? 'text-gray-600' : 'text-blue-100'].join(' ')}
                  >
                    {content}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div
                  className={[
                    'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                    isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
                  ].join(' ')}
                >
                  <ImageIcon size={14} />
                  <span>Imagem</span>
                </div>
                {content ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
                ) : null}
                <p className={['text-xs', isInbound ? 'text-gray-400' : 'text-blue-100'].join(' ')}>
                  Carregando preview...
                </p>
              </div>
            )
          ) : null}

          {/* ── Audio ── */}
          {message.media_type === 'audio' ? (
            <div className="space-y-1">
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
                ].join(' ')}
              >
                <Mic size={14} />
                <span>Áudio</span>
              </div>
              {content && content !== '[audio]' ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
              ) : null}
              <p className={['text-[11px]', isInbound ? 'text-gray-400' : 'text-blue-100'].join(' ')}>
                Preview disponível em breve
              </p>
            </div>
          ) : null}

          {/* ── Document ── */}
          {message.media_type === 'document' ? (
            <div className="space-y-1.5">
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
                ].join(' ')}
              >
                <FileText size={14} />
                <span>
                  {content && content !== '[document]' ? content : 'Documento'}
                </span>
                {(() => {
                  const badge = resolveDocExtensionBadge(content || null)
                  return badge ? (
                    <span className={`rounded px-1 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                      {badge.label}
                    </span>
                  ) : null
                })()}
              </div>
              <button
                type="button"
                disabled
                title="Download em breve"
                className={[
                  'text-xs opacity-50',
                  isInbound ? 'text-gray-500' : 'text-blue-100',
                ].join(' ')}
              >
                Abrir documento
              </button>
            </div>
          ) : null}

          {/* ── Video ── */}
          {message.media_type === 'video' ? (
            <div className="space-y-1">
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
                ].join(' ')}
              >
                <Play size={14} />
                <span>Vídeo</span>
              </div>
              {content && content !== '[video]' ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
              ) : null}
              <p className={['text-[11px]', isInbound ? 'text-gray-400' : 'text-blue-100'].join(' ')}>
                Preview disponível em breve
              </p>
            </div>
          ) : null}

          {/* ── Location ── */}
          {message.media_type === 'location' ? (
            <div className="space-y-1">
              <div
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                  isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
                ].join(' ')}
              >
                <MapPin size={14} />
                <span>Localização</span>
              </div>
              {content ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
              ) : null}
              <span
                className={['text-xs opacity-50', isInbound ? 'text-gray-500' : 'text-blue-100'].join(' ')}
              >
                Ver no Google Maps
              </span>
            </div>
          ) : null}

          {/* ── Generic media label (fallback) ── */}
          {!isImage &&
            message.media_type !== 'text' &&
            message.media_type !== 'audio' &&
            message.media_type !== 'document' &&
            message.media_type !== 'video' &&
            message.media_type !== 'location' &&
            mediaLabel ? (
            <div
              className={[
                'mb-2 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                isInbound ? 'bg-gray-100 text-gray-600' : 'bg-blue-500/50 text-blue-50',
              ].join(' ')}
            >
              {MediaIcon ? <MediaIcon size={14} /> : null}
              <span>{mediaLabel}</span>
            </div>
          ) : null}

          {/* ── Plain text ── */}
          {showPlainText ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{content}</p>
          ) : null}

          <div
            className={[
              'mt-2 flex items-center gap-2 text-[11px]',
              isInbound ? 'text-gray-400' : 'justify-end text-blue-100',
            ].join(' ')}
          >
            <span>{timeLabel}</span>
            {!isInbound && statusMeta ? (
              <span className={statusMeta.tone}>{statusMeta.label}</span>
            ) : null}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && message.media_url ? (
          <ImageLightbox
            key="lightbox"
            src={message.media_url}
            alt={content || 'Imagem'}
            onClose={() => setLightboxOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}
