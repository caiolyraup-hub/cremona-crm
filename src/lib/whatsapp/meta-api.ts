import { getMetaErrorMessage } from './errors'

const META_API_VERSION = 'v18.0'

function buildMetaHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

async function parseMetaError(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return { message: 'Resposta invalida da Meta.' }
  }
}

export async function testMetaWhatsAppConnection(params: {
  phoneNumberId: string
  accessToken: string
}): Promise<{ success: boolean; error: string | null }> {
  const phoneNumberId = params.phoneNumberId.trim()
  const accessToken = params.accessToken.trim()

  if (!phoneNumberId) {
    return { success: false, error: 'Informe o Phone Number ID do WhatsApp.' }
  }

  if (!accessToken) {
    return { success: false, error: 'Informe o token de acesso da Meta.' }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}`,
      {
        method: 'GET',
        headers: buildMetaHeaders(accessToken),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const payload = await parseMetaError(response)
      return {
        success: false,
        error: getMetaErrorMessage(payload),
      }
    }

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    return {
      success: false,
      error: getMetaErrorMessage(error),
    }
  }
}

export async function sendMetaWhatsAppTextMessage(params: {
  phoneNumberId: string
  accessToken: string
  to: string
  text: string
}): Promise<{
  success: boolean
  messageId?: string
  error: string | null
}> {
  const phoneNumberId = params.phoneNumberId.trim()
  const accessToken = params.accessToken.trim()
  const to = params.to.trim()
  const text = params.text.trim()

  if (!phoneNumberId) {
    return { success: false, error: 'Phone Number ID nao configurado para envio.' }
  }

  if (!accessToken) {
    return { success: false, error: 'Token de acesso da Meta nao configurado para envio.' }
  }

  if (!to) {
    return { success: false, error: 'Numero do destinatario nao informado.' }
  }

  if (!text) {
    return { success: false, error: 'Digite uma mensagem antes de enviar.' }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: buildMetaHeaders(accessToken),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: {
            body: text,
          },
        }),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const payload = await parseMetaError(response)
      return {
        success: false,
        error: getMetaErrorMessage(payload),
      }
    }

    try {
      const payload = (await response.json()) as {
        messages?: Array<{ id?: string }>
      }

      return {
        success: true,
        messageId: payload.messages?.[0]?.id,
        error: null,
      }
    } catch {
      return {
        success: true,
        error: null,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: getMetaErrorMessage(error),
    }
  }
}

export type WhatsAppMediaType = 'image' | 'document' | 'audio' | 'video'

export async function sendMetaWhatsAppMediaMessage(params: {
  phoneNumberId: string
  accessToken: string
  to: string
  mediaUrl: string
  mediaType: WhatsAppMediaType
  filename?: string
  caption?: string
}): Promise<{
  success: boolean
  messageId?: string
  error: string | null
}> {
  const phoneNumberId = params.phoneNumberId.trim()
  const accessToken = params.accessToken.trim()
  const to = params.to.trim()
  const mediaUrl = params.mediaUrl.trim()
  const mediaType = params.mediaType
  const caption = params.caption?.trim()
  const filename = params.filename?.trim()

  if (!phoneNumberId) return { success: false, error: 'Phone Number ID nao configurado para envio.' }
  if (!accessToken) return { success: false, error: 'Token de acesso da Meta nao configurado para envio.' }
  if (!to) return { success: false, error: 'Numero do destinatario nao informado.' }
  if (!mediaUrl) return { success: false, error: 'URL da midia nao informada.' }

  const mediaPayload: Record<string, string> = { link: mediaUrl }
  if (caption && mediaType !== 'audio') mediaPayload.caption = caption
  if (filename && mediaType === 'document') mediaPayload.filename = filename

  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: buildMetaHeaders(accessToken),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: mediaPayload,
        }),
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      const payload = await parseMetaError(response)
      return { success: false, error: getMetaErrorMessage(payload) }
    }

    try {
      const payload = (await response.json()) as { messages?: Array<{ id?: string }> }
      return { success: true, messageId: payload.messages?.[0]?.id, error: null }
    } catch {
      return { success: true, error: null }
    }
  } catch (error) {
    return { success: false, error: getMetaErrorMessage(error) }
  }
}
