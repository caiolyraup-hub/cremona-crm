import crypto from 'crypto'
import { maskEmail, maskPhone } from '../src/lib/leads/security.ts'

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const send = process.argv.includes('--send')
const withoutOptIn = process.argv.includes('--no-opt-in')
const endpoint = process.env.LEADS_ENDPOINT_URL?.trim()
const key = process.env.CREMONA_LEAD_SOURCE_KEY?.trim()
const phone = process.env.LEADS_TEST_PHONE?.trim()
const email = process.env.LEADS_TEST_EMAIL?.trim() || null
const idempotencyKey = arg('--idempotency-key') ?? crypto.randomUUID()

if (!endpoint) throw new Error('LEADS_ENDPOINT_URL nao configurada.')
if (!key) throw new Error('CREMONA_LEAD_SOURCE_KEY nao configurada.')
if (!phone) throw new Error('LEADS_TEST_PHONE nao configurado.')

const payload = {
  name: 'Lead Teste Cremona',
  phone,
  email,
  company: 'Teste',
  position: 'Lead',
  tags: ['teste-endpoint'],
  custom_fields: { test_run: true },
  external_lead_id: `test-${idempotencyKey}`,
  source: 'manual_test',
  whatsapp_opt_in: !withoutOptIn,
  whatsapp_opt_in_text: withoutOptIn
    ? undefined
    : 'Aceito receber contato pelo WhatsApp sobre meu atendimento.',
  utm_source: 'manual',
  utm_medium: 'script',
  utm_campaign: 'beta',
}

console.log('Endpoint:', endpoint)
console.log('Telefone:', maskPhone(phone))
console.log('E-mail:', maskEmail(email))
console.log('Opt-in:', payload.whatsapp_opt_in)
console.log('Idempotency-Key:', idempotencyKey)

if (!send) {
  console.log('Dry-run. Use --send para enviar uma requisicao real.')
  process.exit(0)
}

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 12_000)

try {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })

  const text = await response.text()
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = text.slice(0, 300)
  }

  console.log('HTTP:', response.status)
  console.log('Resposta:', parsed)
} finally {
  clearTimeout(timeout)
}
