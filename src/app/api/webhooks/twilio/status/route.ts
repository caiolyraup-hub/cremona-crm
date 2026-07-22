import { NextResponse } from 'next/server'
import {
  handleTwilioStatusWebhook,
  parseTwilioForm,
  validateTwilioWebhookSignature,
} from '@/lib/whatsapp/twilio-webhooks'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const payload = parseTwilioForm(body)
  const canonicalUrl = process.env.TWILIO_STATUS_CALLBACK_URL?.trim() ?? ''
  const signature = request.headers.get('x-twilio-signature')

  if (!validateTwilioWebhookSignature({ signature, url: canonicalUrl, payload })) {
    return new NextResponse('', { status: 403 })
  }

  const result = await handleTwilioStatusWebhook(payload)
  return new NextResponse(result.body, { status: result.status })
}
