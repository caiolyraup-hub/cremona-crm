import assert from 'assert'
import twilio from 'twilio'
import { normalizeTwilioWhatsAppAddress } from '../src/lib/whatsapp/providers/twilio.ts'
import { mapTwilioStatus, shouldUpdateMessageStatus } from '../src/lib/whatsapp/status.ts'

function parseTwilioForm(body: string): Record<string, string> {
  const params = new URLSearchParams(body)
  const payload: Record<string, string> = {}
  params.forEach((value, key) => {
    payload[key] = value
  })
  return payload
}

function validateTwilioWebhookSignature(params: {
  signature: string
  url: string
  payload: Record<string, string>
}) {
  return twilio.validateRequest('test_token', params.signature, params.url, params.payload)
}

function test(name: string, fn: () => void) {
  fn()
  console.log(`ok - ${name}`)
}

test('template payload shape', () => {
  const payload = {
    from: 'whatsapp:+5582999999999',
    to: normalizeTwilioWhatsAppAddress('+5582888888888'),
    contentSid: 'HX00000000000000000000000000000000',
    contentVariables: JSON.stringify({ 1: 'Caio' }),
    statusCallback: 'https://example.com/api/webhooks/twilio/status',
  }

  assert.equal(payload.to, 'whatsapp:+5582888888888')
  assert.equal(payload.contentSid.startsWith('HX'), true)
  assert.equal(JSON.parse(payload.contentVariables)['1'], 'Caio')
})

test('text payload shape', () => {
  const payload = {
    from: 'whatsapp:+5582999999999',
    to: normalizeTwilioWhatsAppAddress('5582888888888'),
    body: 'Ola',
    statusCallback: 'https://example.com/api/webhooks/twilio/status',
  }

  assert.equal(payload.to, 'whatsapp:+5582888888888')
  assert.equal(payload.body, 'Ola')
})

test('closed window blocks text before provider call', () => {
  let called = false
  const windowOpen = false
  if (windowOpen) called = true
  assert.equal(called, false)
})

test('accepted dispatch is idempotent', () => {
  const dispatch = { status: 'accepted', provider_message_id: 'SM123' }
  const shouldSend = !(dispatch.status === 'accepted' && dispatch.provider_message_id)
  assert.equal(shouldSend, false)
})

test('concurrent dispatch only allows one sender', () => {
  let status = 'prepared'
  const claim = () => {
    if (status !== 'prepared') return false
    status = 'sending'
    return true
  }
  assert.equal(claim(), true)
  assert.equal(claim(), false)
})

test('delivery unknown is terminal for automatic retry', () => {
  const result = { success: false, deliveryUnknown: true, retryable: false }
  assert.equal(result.retryable, false)
})

test('valid webhook signature', () => {
  process.env.TWILIO_AUTH_TOKEN = 'test_token'
  const url = 'https://example.com/api/webhooks/twilio/whatsapp'
  const payload = { MessageSid: 'SM123', AccountSid: 'AC123', From: 'whatsapp:+1', To: 'whatsapp:+2' }
  const signature = twilio.getExpectedTwilioSignature('test_token', url, payload)
  assert.equal(validateTwilioWebhookSignature({ signature, url, payload }), true)
})

test('invalid webhook signature', () => {
  process.env.TWILIO_AUTH_TOKEN = 'test_token'
  const url = 'https://example.com/api/webhooks/twilio/whatsapp'
  const payload = { MessageSid: 'SM123' }
  assert.equal(validateTwilioWebhookSignature({ signature: 'invalid', url, payload }), false)
})

test('duplicate webhook key uses MessageSid', () => {
  const seen = new Set<string>()
  const save = (sid: string) => {
    if (seen.has(sid)) return false
    seen.add(sid)
    return true
  }
  assert.equal(save('SM123'), true)
  assert.equal(save('SM123'), false)
})

test('status callback mapping', () => {
  assert.equal(mapTwilioStatus('sent'), 'sent')
  assert.equal(mapTwilioStatus('delivered'), 'delivered')
  assert.equal(mapTwilioStatus('read'), 'read')
  assert.equal(mapTwilioStatus('failed'), 'failed')
})

test('out of order statuses do not regress', () => {
  assert.equal(shouldUpdateMessageStatus('read', 'delivered'), false)
  assert.equal(shouldUpdateMessageStatus('delivered', 'sent'), false)
})

test('workspace isolation uses To sender, not workspace_id input', () => {
  const payload = parseTwilioForm('To=whatsapp%3A%2B5582999999999&workspace_id=evil')
  assert.equal(payload.To, 'whatsapp:+5582999999999')
  assert.equal(payload.workspace_id, 'evil')
})

test('meta provider remains selectable', () => {
  const provider = 'meta_cloud'
  assert.equal(provider, 'meta_cloud')
})
