const META_API_VERSION = 'v18.0'
const OUTBOUND_MEDIA_BUCKET = 'outbound-media'

export type OutboundMediaType = 'image' | 'document' | 'audio' | 'video'

export function resolveOutboundMediaType(file: File): OutboundMediaType {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return 'document'
}

export async function uploadOutboundMedia(params: {
  supabase: {
    storage: {
      from: (bucket: string) => {
        upload: (path: string, file: File, options?: { cacheControl?: string; upsert?: boolean }) => Promise<{ error: { message: string } | null }>
        getPublicUrl: (path: string) => { data: { publicUrl: string } }
      }
    }
  }
  workspaceId: string
  file: File
}): Promise<{
  url: string | null
  mediaType: OutboundMediaType
  filename: string
  error: string | null
}> {
  const mediaType = resolveOutboundMediaType(params.file)
  const safeName = params.file.name.replace(/[^\w.\-]+/g, '-').replace(/-+/g, '-')
  const path = `${params.workspaceId}/${Date.now()}-${safeName}`

  const { error } = await params.supabase.storage
    .from(OUTBOUND_MEDIA_BUCKET)
    .upload(path, params.file, { cacheControl: '3600', upsert: false })

  if (error) {
    return {
      url: null,
      mediaType,
      filename: params.file.name,
      error: error.message || 'Nao foi possivel enviar o arquivo.',
    }
  }

  const { data } = params.supabase.storage.from(OUTBOUND_MEDIA_BUCKET).getPublicUrl(path)

  return {
    url: data.publicUrl,
    mediaType,
    filename: params.file.name,
    error: null,
  }
}

export async function getMediaUrl(
  mediaId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!response.ok) return null

    const data = await response.json().catch(() => null)
    return (data?.url as string | undefined) ?? null
  } catch (error) {
    console.error('[whatsapp/media] getMediaUrl error', error)
    return null
  }
}

export async function downloadMediaAsBase64(
  mediaUrl: string,
  accessToken: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) return null

    const mimeType = response.headers.get('Content-Type') ?? 'application/octet-stream'
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return { base64, mimeType }
  } catch (error) {
    console.error('[whatsapp/media] downloadMediaAsBase64 error', error)
    return null
  }
}
