import { createHmac } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return
  }

  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue

    const key = match[1].trim()
    let value = match[2].trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function buildMessageByMode(mode: string, timestamp: string) {
  const messageId = `wamid.test-${mode}-${Date.now()}`

  if (mode === 'image') {
    return {
      from: '5511988887777',
      id: messageId,
      timestamp,
      type: 'image',
      image: {
        id: 'media-image-id',
        mime_type: 'image/jpeg',
        sha256: 'fake-sha',
        caption: 'Imagem do teste',
      },
    }
  }

  if (mode === 'audio') {
    return {
      from: '5511988887777',
      id: messageId,
      timestamp,
      type: 'audio',
      audio: {
        id: 'media-audio-id',
        mime_type: 'audio/ogg',
        sha256: 'fake-sha',
      },
    }
  }

  if (mode === 'document') {
    return {
      from: '5511988887777',
      id: messageId,
      timestamp,
      type: 'document',
      document: {
        id: 'media-document-id',
        mime_type: 'application/pdf',
        sha256: 'fake-sha',
        filename: 'contrato-teste.pdf',
      },
    }
  }

  if (mode === 'video') {
    return {
      from: '5511988887777',
      id: messageId,
      timestamp,
      type: 'video',
      video: {
        id: 'media-video-id',
        mime_type: 'video/mp4',
        sha256: 'fake-sha',
        caption: 'Video do teste',
      },
    }
  }

  if (mode === 'location') {
    return {
      from: '5511988887777',
      id: messageId,
      timestamp,
      type: 'location',
      location: {
        latitude: -9.6498,
        longitude: -35.7089,
        name: 'Maceio',
        address: 'Alagoas',
      },
    }
  }

  return {
    from: '5511988887777',
    id: messageId,
    timestamp,
    text: { body: 'Ola, tudo bem?' },
    type: 'text',
  }
}

function buildPayload(mode: string, timestamp: string) {
  if (mode === 'status') {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                statuses: [
                  {
                    id: process.env.WEBHOOK_STATUS_MESSAGE_ID ?? 'wamid.status-test',
                    status: process.env.WEBHOOK_STATUS_VALUE ?? 'delivered',
                    timestamp,
                    recipient_id: '5511988887777',
                    errors:
                      (process.env.WEBHOOK_STATUS_VALUE ?? 'delivered') === 'failed'
                        ? [
                            {
                              code: 131026,
                              title: 'Erro simulado',
                              message: 'Falha simulada no envio',
                            },
                          ]
                        : undefined,
                  },
                ],
              },
            },
          ],
        },
      ],
    }
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '5511999999999',
                phone_number_id: 'PHONE_ID',
              },
              contacts: [
                {
                  profile: { name: 'Joao Teste' },
                  wa_id: '5511988887777',
                },
              ],
              messages: [buildMessageByMode(mode, timestamp)],
            },
          },
        ],
      },
    ],
  }
}

function joinUrl(baseUrl: string, pathname: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${pathname}`
}

function buildVerificationUrl(baseUrl: string, verifyToken: string, challenge: string): string {
  const url = new URL(joinUrl(baseUrl, '/api/whatsapp/webhook'))
  url.searchParams.set('hub.mode', 'subscribe')
  url.searchParams.set('hub.verify_token', verifyToken)
  url.searchParams.set('hub.challenge', challenge)
  return url.toString()
}

loadEnvFile(path.join(process.cwd(), '.env.local'))

const baseUrl = (process.env.WEBHOOK_BASE_URL ?? 'http://localhost:3000').trim()
const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN ?? 'codex-test-verify-token').trim()
const appSecret = (process.env.WHATSAPP_APP_SECRET ?? '').trim()
const challenge = '123'
const webhookUrl = joinUrl(baseUrl, '/api/whatsapp/webhook')
const verificationUrl = buildVerificationUrl(baseUrl, verifyToken, challenge)

type TestResult = {
  label: string
  ok: boolean
  status: number
  body: string
}

function buildSignature(rawBody: string): string | null {
  if (!appSecret) return null
  return `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
}

async function runGetVerificationTest(): Promise<TestResult> {
  const response = await fetch(verificationUrl)
  const body = await response.text()

  return {
    label: 'GET verification',
    ok: response.status === 200 && body === challenge,
    status: response.status,
    body,
  }
}

async function runPostTest(mode: 'text' | 'image' | 'status'): Promise<TestResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const rawBody = JSON.stringify(buildPayload(mode, timestamp))
  const signature = buildSignature(rawBody)
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  if (signature) {
    headers['x-hub-signature-256'] = signature
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: rawBody,
  })

  const body = await response.text()

  return {
    label:
      mode === 'text'
        ? 'POST text message'
        : mode === 'image'
          ? 'POST media message'
          : 'POST status callback',
    ok: response.status === 200,
    status: response.status,
    body,
  }
}

async function main() {
  console.log('WhatsApp Webhook Test')
  console.log('')
  console.log(`Base URL: ${baseUrl}`)
  console.log('')

  if (!verifyToken) {
    console.warn('WHATSAPP_VERIFY_TOKEN nao esta definido. O teste de GET pode falhar.')
  }

  if (!appSecret) {
    console.warn(
      'WHATSAPP_APP_SECRET nao esta definido. O POST so sera aceito sem HMAC em ambiente de desenvolvimento.'
    )
  }

  const results = [
    await runGetVerificationTest(),
    await runPostTest('text'),
    await runPostTest('image'),
    await runPostTest('status'),
  ]

  for (const result of results) {
    console.log(`${result.label}: ${result.ok ? 'OK' : 'FAIL'}`)

    if (!result.ok) {
      console.log(`  status: ${result.status}`)
      console.log(`  body: ${result.body}`)
    }
  }

  const hasFailure = results.some((result) => !result.ok)
  if (hasFailure) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Erro ao testar webhook:', error)
  process.exit(1)
})
