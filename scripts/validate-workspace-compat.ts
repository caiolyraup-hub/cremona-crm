import assert from 'assert'
import {
  canWorkspaceSendWhatsAppMessages,
  getWorkspaceByIdCompatible,
} from '../src/lib/workspace-compat.ts'

type QueryResponse = {
  data: Record<string, unknown> | null
  error: { message: string; code?: string; details?: string; hint?: string } | null
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

const workspaceId = '7ca55bf5-5726-4d2a-9d70-419f5fb1b864'
const twilioWorkspace = {
  id: workspaceId,
  name: 'Cremona',
  slug: 'cremona',
  owner_id: 'user-id',
  whatsapp_phone: null,
  whatsapp_token: null,
  whatsapp_provider: 'twilio',
  twilio_whatsapp_from: 'whatsapp:+5582936180673',
  twilio_content_sid_new_lead: null,
  plan: 'trial',
  trial_ends_at: null,
  created_at: '2026-07-22T00:00:00.000Z',
  onboarding_completed: true,
  business_name: 'Cremona',
  business_type: null,
  logo_url: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  stripe_price_id: null,
  subscription_status: null,
  subscription_ends_at: null,
}

const supabase = new FakeSupabase([
  {
    data: null,
    error: {
      message:
        'Could not find the whatsapp_phone_number_id column of workspaces in the schema cache',
    },
  },
  {
    data: twilioWorkspace,
    error: null,
  },
])

const result = await getWorkspaceByIdCompatible(supabase as never, workspaceId)

assert.equal(result.error, null)
assert.equal(result.workspace?.id, workspaceId)
assert.equal(result.workspace?.whatsapp_provider, 'twilio')
assert.equal(result.workspace?.twilio_whatsapp_from, 'whatsapp:+5582936180673')
assert.equal(result.workspace?.whatsapp_phone_number_id, null)
assert.equal(canWorkspaceSendWhatsAppMessages(result.workspace), true)
assert.equal(
  supabase.selects[1].includes('whatsapp_phone_number_id'),
  false,
  'fallback query must not require legacy Meta columns'
)

console.log('OK workspace compatibility validation')
