'use client'

import { useState, useTransition } from 'react'
import { FileText, Mic, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { sendMediaMessageAction } from '@/app/(dashboard)/dashboard/inbox/actions'
import type { OutboundMediaType } from '@/lib/whatsapp/media-upload'

type MediaPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  contactId: string
  media: {
    url: string
    mediaType: OutboundMediaType
    filename: string
    previewUrl?: string
  } | null
  onSuccess?: () => void
}

export function MediaPreviewModal({
  open,
  onOpenChange,
  workspaceId,
  contactId,
  media,
  onSuccess,
}: MediaPreviewModalProps) {
  const [caption, setCaption] = useState('')
  const [isPending, startTransition] = useTransition()

  if (!media) return null

  function handleSend() {
    if (!media) return
    startTransition(async () => {
      const result = await sendMediaMessageAction({
        workspaceId,
        contactId,
        mediaUrl: media.url,
        mediaType: media.mediaType,
        filename: media.filename,
        caption,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Midia enviada')
      setCaption('')
      onOpenChange(false)
      onSuccess?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enviar midia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4">
            {media.mediaType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media.previewUrl ?? media.url}
                alt={media.filename}
                className="max-h-[260px] max-w-full rounded-lg object-contain"
              />
            ) : media.mediaType === 'audio' ? (
              <audio controls src={media.previewUrl ?? media.url} className="w-full" />
            ) : media.mediaType === 'video' ? (
              <video controls src={media.previewUrl ?? media.url} className="max-h-[260px] max-w-full rounded-lg" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-500">
                <FileText size={32} />
                <span className="max-w-[260px] truncate text-sm font-medium">{media.filename}</span>
              </div>
            )}
            {media.mediaType === 'audio' ? <Mic size={0} className="hidden" /> : null}
            {media.mediaType === 'video' ? <Video size={0} className="hidden" /> : null}
          </div>

          {media.mediaType !== 'audio' ? (
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              rows={3}
              maxLength={1024}
              placeholder="Adicionar legenda..."
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          ) : null}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSend}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? 'Enviando...' : 'Enviar midia'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
