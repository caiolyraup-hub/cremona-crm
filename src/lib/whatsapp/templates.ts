import { getMetaErrorMessage } from './errors'
import type { WhatsAppTemplate, SendTemplateResult } from '@/types/whatsapp'

const META_API_VERSION = 'v18.0'

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  template: WhatsAppTemplate
): Promise<SendTemplateResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: template.name,
            language: { code: template.language },
            components: template.components ?? [],
          },
        }),
      }
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorMessage = getMetaErrorMessage(data) ?? `Erro ${response.status} da Meta API`
      return { success: false, error: errorMessage }
    }

    const messageId = data?.messages?.[0]?.id as string | undefined
    return { success: true, messageId }
  } catch {
    return { success: false, error: 'Erro de conexão com a Meta API' }
  }
}
