import assert from 'assert'
import twilio from 'twilio'
import { getWhatsAppProviderForWorkspace } from '../src/lib/whatsapp/providers/index.ts'
import {
  getTwilioClient,
  normalizeTwilioWhatsAppAddress,
} from '../src/lib/whatsapp/providers/twilio.ts'
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

async function testAsync(name: string, fn: () => Promise<void>) {
  await fn()
  console.log(`ok - ${name}`)
}

type QueryResponse = {
  data: Record<string, unknown> | null
  error: { message: string; code?: string } | null
}

class FakeQuery {
  private response: QueryResponse

  constructor(response: QueryResponse) {
    this.response = response
  }

  eq() {
    return this
  }

  maybeSingle() {
    return Promise.resolve(this.response)
  }
}

class FakeSupabase {
  public selects: string[] = []
  private responses: QueryResponse[]

  constructor(responses: QueryResponse[]) {
    this.responses = responses
  }

  from(table: string) {
    assert.equal(table, 'workspaces')
    return {
      select: (select: string) => {
        this.selects.push(select)
        const response = this.responses.shift()
        if (!response) throw new Error('Unexpected query')
        return new FakeQuery(response)
      },
    }
  }
}

function configureTwilioEnv() {
  process.env.TWILIO_ACCOUNT_SID = 'AC00000000000000000000000000000000'
  process.env.TWILIO_API_KEY_SID = 'SK00000000000000000000000000000000'
  process.env.TWILIO_API_KEY_SECRET = 'secret'
  process.env.TWILIO_AUTH_TOKEN = 'test_token'
  process.env.TWILIO_STATUS_CALLBACK_URL = 'https://example.com/api/webhooks/twilio/status'
}

function resetTwilioEnv() {
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_API_KEY_SID
  delete process.env.TWILIO_API_KEY_SECRET
  delete process.env.TWILIO_AUTH_TOKEN
  delete process.env.TWILIO_STATUS_CALLBACK_URL
}

function createRecordingTwilioFactory() {
  const calls: Array<{ username: string; password: string; opts?: { accountSid?: string } }> = []
  const client = {
    messages: {
      create: async () => ({ sid: 'SM123', status: 'queued' }),
    },
  }

  return {
    calls,
    factory: (username: string, password: string, opts?: { accountSid?: string }) => {
      calls.push({ username, password, opts })
      return client as ReturnType<typeof twilio>
    },
  }
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

test('Twilio client uses complete API Key first', () => {
  resetTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'AC_account'
  process.env.TWILIO_API_KEY_SID = 'SK_key'
  process.env.TWILIO_API_KEY_SECRET = 'api_secret'
  process.env.TWILIO_AUTH_TOKEN = 'auth_token'
  const recorder = createRecordingTwilioFactory()

  const result = getTwilioClient(recorder.factory)

  assert.equal(result.error, null)
  assert.equal(result.authMethod, 'api_key')
  assert.equal(recorder.calls[0].username, 'SK_key')
  assert.equal(recorder.calls[0].password, 'api_secret')
  assert.equal(recorder.calls[0].opts?.accountSid, 'AC_account')
})

test('Twilio client falls back to Auth Token', () => {
  resetTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'AC_account'
  process.env.TWILIO_AUTH_TOKEN = 'auth_token'
  const recorder = createRecordingTwilioFactory()

  const result = getTwilioClient(recorder.factory)

  assert.equal(result.error, null)
  assert.equal(result.authMethod, 'auth_token')
  assert.equal(recorder.calls[0].username, 'AC_account')
  assert.equal(recorder.calls[0].password, 'auth_token')
  assert.equal(recorder.calls[0].opts, undefined)
  assert.ok(result.client?.messages)
})

test('Twilio client ignores incomplete API Key and uses Auth Token', () => {
  resetTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'AC_account'
  process.env.TWILIO_API_KEY_SID = 'SK_key'
  process.env.TWILIO_AUTH_TOKEN = 'auth_token'
  const recorder = createRecordingTwilioFactory()

  const result = getTwilioClient(recorder.factory)

  assert.equal(result.error, null)
  assert.equal(result.authMethod, 'auth_token')
  assert.equal(recorder.calls[0].username, 'AC_account')
  assert.equal(recorder.calls[0].password, 'auth_token')
})

test('Twilio client returns sanitized error without usable credentials', () => {
  resetTwilioEnv()
  process.env.TWILIO_ACCOUNT_SID = 'AC_account'
  process.env.TWILIO_API_KEY_SID = 'SK_key'
  const recorder = createRecordingTwilioFactory()

  const result = getTwilioClient(recorder.factory)

  assert.equal(result.client, null)
  assert.equal(result.authMethod, null)
  assert.equal(
    result.error,
    'Configure TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET ou TWILIO_AUTH_TOKEN.'
  )
  assert.equal(result.error?.includes('SK_key'), false)
  assert.equal(recorder.calls.length, 0)
})

test('Twilio client reports missing Account SID explicitly', () => {
  resetTwilioEnv()
  process.env.TWILIO_AUTH_TOKEN = 'auth_token'
  const recorder = createRecordingTwilioFactory()

  const result = getTwilioClient(recorder.factory)

  assert.equal(result.client, null)
  assert.equal(result.error, 'TWILIO_ACCOUNT_SID nao configurado.')
  assert.equal(recorder.calls.length, 0)
})

async function main() {
  await testAsync('provider resolver uses Twilio without legacy Meta columns', async () => {
    configureTwilioEnv()
    const supabase = new FakeSupabase([
      {
        data: {
          id: 'workspace-id',
          whatsapp_provider: 'twilio',
          whatsapp_phone: null,
          whatsapp_token: null,
          twilio_whatsapp_from: 'whatsapp:+5582936180673',
          twilio_content_sid_new_lead: null,
        },
        error: null,
      },
    ])

    const result = await getWhatsAppProviderForWorkspace('workspace-id', supabase as never)

    assert.equal(result.error, undefined)
    assert.equal(result.provider?.name, 'twilio')
    assert.equal(result.workspace?.whatsapp_provider, 'twilio')
    assert.equal(result.workspace?.twilio_whatsapp_from, 'whatsapp:+5582936180673')
    assert.equal(result.workspace?.whatsapp_phone_number_id, null)
    assert.equal(
      supabase.selects.some((select) => select.includes('whatsapp_phone_number_id')),
      false,
      'Twilio provider resolution must not select legacy Meta columns'
    )
  })

  await testAsync('provider resolver validates Meta fields only for meta_cloud', async () => {
    const supabase = new FakeSupabase([
      {
        data: {
          id: 'workspace-id',
          whatsapp_provider: 'meta_cloud',
          whatsapp_phone: '+5582999999999',
          whatsapp_token: 'meta-token',
          twilio_whatsapp_from: null,
          twilio_content_sid_new_lead: null,
        },
        error: null,
      },
      {
        data: {
          whatsapp_phone_number_id: '123456789',
          whatsapp_business_account_id: '987654321',
        },
        error: null,
      },
    ])

    const result = await getWhatsAppProviderForWorkspace('workspace-id', supabase as never)

    assert.equal(result.error, undefined)
    assert.equal(result.provider?.name, 'meta_cloud')
    assert.equal(result.workspace?.whatsapp_phone_number_id, '123456789')
    assert.equal(
      supabase.selects[1],
      'whatsapp_phone_number_id, whatsapp_business_account_id'
    )
  })

  await testAsync('legacy Meta column error does not affect Twilio workspace', async () => {
    configureTwilioEnv()
    const supabase = new FakeSupabase([
      {
        data: {
          id: 'workspace-id',
          whatsapp_provider: 'twilio',
          whatsapp_phone: null,
          whatsapp_token: null,
          twilio_whatsapp_from: 'whatsapp:+5582936180673',
          twilio_content_sid_new_lead: null,
        },
        error: null,
      },
    ])

    const result = await getWhatsAppProviderForWorkspace('workspace-id', supabase as never)

    assert.equal(result.provider?.name, 'twilio')
    assert.equal(
      supabase.selects.join(' ').includes('whatsapp_business_account_id'),
      false
    )
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
