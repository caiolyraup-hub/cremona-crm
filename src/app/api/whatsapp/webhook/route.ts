import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import {
  processIncomingMessage,
  processWhatsAppStatusUpdate,
} from '@/lib/whatsapp/process-incoming-message'
import { getWhatsAppEnvStatus } from '@/lib/whatsapp/env'
import {
  logWhatsAppError,
  logWhatsAppInfo,
  logWhatsAppWarn,
} from '@/lib/whatsapp/logger'
import type { WhatsAppContact, WhatsAppWebhookPayload } from '@/types/whatsapp'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

// Rate limiting — por instância da Vercel, sem Redis.
// Para alto volume em produção, substituir por Upstash Redis ou similar.
const _rl = new Map<string, { n: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = _rl.get(ip)

  if (entry) {
    if (entry.resetAt < now) {
      _rl.delete(ip)
    } else if (entry.n >= 100) {
      return false
    } else {
      entry.n++
      return true
    }
  }

  _rl.set(ip, { n: 1, resetAt: now + 60_000 })
  return true
}

function isValidSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader) return false
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const providedBuffer = Buffer.from(signatureHeader)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return false
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export async function GET(request: Request) {
  const envStatus = getWhatsAppEnvStatus()
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const verifyToken = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (
    mode === 'subscribe' &&
    envStatus.hasVerifyToken &&
    verifyToken &&
    verifyToken === env.whatsapp.verifyToken &&
    challenge
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  logWhatsAppWarn('Falha na verificacao do webhook.', {
    mode,
    has_verify_token: Boolean(verifyToken),
    webhook_ready: envStatus.isReadyForWebhookVerification,
  })

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()

  if (!checkRateLimit(ip)) {
    logWhatsAppWarn('Rate limit atingido.', { ip })
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  const rawBody = await request.text()
  const envStatus = getWhatsAppEnvStatus()
  const appSecret = env.whatsapp.appSecret

  if (appSecret) {
    const signatureHeader = request.headers.get('x-hub-signature-256')
    if (!isValidSignature(rawBody, signatureHeader, appSecret)) {
      logWhatsAppWarn('Assinatura HMAC invalida no webhook.', {
        has_signature: Boolean(signatureHeader),
      })
      return new NextResponse('Forbidden', { status: 403 })
    }
  } else {
    // Sem secret: logar erro crítico mas não retornar 5xx (a Meta retenta 5xx e pode
    // desativar o endpoint). Em produção, WHATSAPP_APP_SECRET é obrigatório.
    logWhatsAppError('WHATSAPP_APP_SECRET nao configurado. Validacao HMAC ignorada.')
    if (!envStatus.hasVerifyToken) {
      return NextResponse.json({ received: true })
    }
  }

  let payload: WhatsAppWebhookPayload

  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload
  } catch (error) {
    // Payload mal-formado: retornar 200 para a Meta não retentar (não é um erro recuperável).
    logWhatsAppError('Payload JSON invalido no webhook.', error)
    return NextResponse.json({ received: true })
  }

  if (!payload.entry?.length) {
    logWhatsAppWarn('Payload recebido sem entry. Evento ignorado.')
    return NextResponse.json({ received: true })
  }

  const jobs: Array<Promise<void>> = []
  let processedMessages = 0
  let processedStatuses = 0
  let sawExpectedData = false

  for (const entry of payload.entry) {
    if (!entry.changes?.length) {
      logWhatsAppWarn('Entry do webhook recebida sem changes. Evento ignorado.', {
        entry_id: entry.id,
      })
      continue
    }

    for (const change of entry.changes) {
      const metadata = change.value?.metadata
      const contacts = change.value?.contacts ?? []
      const messages = change.value?.messages ?? []
      const statuses = change.value?.statuses ?? []

      if (statuses.length > 0) sawExpectedData = true

      for (const status of statuses) {
        processedStatuses += 1
        jobs.push(processWhatsAppStatusUpdate(status))
      }

      if (messages.length === 0) {
        if (!statuses.length) {
          logWhatsAppWarn('Change recebida sem messages nem statuses. Evento ignorado.', {
            entry_id: entry.id,
            field: change.field,
            has_metadata: Boolean(metadata),
          })
        }
        continue
      }

      if (!metadata) {
        logWhatsAppWarn('Change com messages recebida sem metadata. Evento ignorado.', {
          entry_id: entry.id,
          field: change.field,
          message_count: messages.length,
        })
        continue
      }

      sawExpectedData = true

      for (const message of messages) {
        processedMessages += 1
        const matchedContact: WhatsAppContact | undefined =
          contacts.find((contact) => contact.wa_id === message.from) ?? contacts[0]
        jobs.push(processIncomingMessage({ message, contact: matchedContact, metadata }))
      }
    }
  }

  if (!sawExpectedData) {
    logWhatsAppWarn('Webhook recebeu payload sem eventos processaveis.')
    return NextResponse.json({ received: true })
  }

  const results = await Promise.allSettled(jobs)
  const rejectedCount = results.filter((r) => r.status === 'rejected').length

  for (const result of results) {
    if (result.status === 'rejected') {
      logWhatsAppError('Falha interna ao processar evento do webhook.', result.reason)
    }
  }

  logWhatsAppInfo('Webhook processado com sucesso.', {
    message_count: processedMessages,
    status_count: processedStatuses,
    rejected_count: rejectedCount,
  })

  return NextResponse.json({ received: true })
}
