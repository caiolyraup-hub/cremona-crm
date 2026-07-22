'use client'

import { useRef, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { uploadOutboundMedia, type OutboundMediaType } from '@/lib/whatsapp/media-upload'

type MediaUploadButtonProps = {
  workspaceId: string
  disabled?: boolean
  onUploaded: (media: {
    url: string
    mediaType: OutboundMediaType
    filename: string
    file: File
  }) => void
}

export function MediaUploadButton({ workspaceId, disabled, onUploaded }: MediaUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo deve ter no maximo 16MB.')
      return
    }

    setIsUploading(true)
    const result = await uploadOutboundMedia({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: createClient() as any,
      workspaceId,
      file,
    })
    setIsUploading(false)

    if (result.error || !result.url) {
      toast.error(result.error ?? 'Nao foi possivel enviar o arquivo.')
      return
    }

    onUploaded({
      url: result.url,
      mediaType: result.mediaType,
      filename: result.filename,
      file,
    })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,audio/*,video/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        title="Anexar arquivo"
        className="flex h-11 min-w-[44px] items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:bg-gray-50 disabled:text-gray-300"
      >
        {isUploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        ) : (
          <Paperclip size={16} />
        )}
      </button>
    </>
  )
}
