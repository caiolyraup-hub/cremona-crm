import { createHash } from 'crypto'

const DEFAULT_META_PIXEL_ID = '4347614672125743'

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (count: number) => Promise<{ data: unknown[] | null; error: unknown }>
      }
    }
  }
}

type SaleConversionInput = {
  id: string
  workspace_id: string
  contact_id: string | null
  product_name: string
  value: number | string | null
  status: string | null
}

type ContactRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  custom_fields: Record<string, unknown> | null
}

function sha256(value: unknown): string | undefined {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return undefined

  return createHash('sha256').update(normalized).digest('hex')
}

function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 || digits.length === 11) return `55${digits}`

  return digits
}

function splitName(name: unknown) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

async function getContact(supabase: SupabaseLike, sale: SaleConversionInput): Promise<ContactRow | null> {
  if (!sale.contact_id) return null

  const { data } = await supabase
    .from('contacts')
    .select('id,name,phone,email,custom_fields')
    .eq('id', sale.contact_id)
    .limit(1)

  return ((data ?? [])[0] as ContactRow | undefined) ?? null
}

export async function sendMetaPurchaseEvent(
  supabase: SupabaseLike,
  sale: SaleConversionInput
): Promise<{ sent: boolean; reason?: string }> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  const pixelId = process.env.META_PIXEL_ID || DEFAULT_META_PIXEL_ID

  if (!accessToken) return { sent: false, reason: 'meta_capi_not_configured' }
  if (sale.status !== 'paid') return { sent: false, reason: 'sale_not_paid' }

  const contact = await getContact(supabase, sale)
  const { firstName, lastName } = splitName(contact?.name)
  const city = contact?.custom_fields?.cidade || contact?.custom_fields?.city
  const value = Number(sale.value || 0)

  const userData: Record<string, string> = {
    em: sha256(contact?.email) || '',
    ph: sha256(normalizePhone(contact?.phone)) || '',
    fn: sha256(firstName) || '',
    ln: sha256(lastName) || '',
    ct: sha256(city) || '',
  }

  Object.keys(userData).forEach((key) => {
    if (!userData[key]) delete userData[key]
  })

  const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `sale-${sale.id}`,
          action_source: 'system_generated',
          user_data: userData,
          custom_data: {
            currency: 'BRL',
            value,
            content_name: sale.product_name,
            content_category: 'Cremona CRM Sale',
            order_id: sale.id,
          },
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Falha na Meta Conversions API: ${response.status} ${body}`)
  }

  return { sent: true }
}
