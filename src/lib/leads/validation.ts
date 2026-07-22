import {
  normalizeBrazilianPhone,
  normalizeCustomFields,
  normalizeEmail,
  normalizeOptionalString,
  normalizeTags,
} from '@/lib/contacts/normalize'

export const MAX_LEAD_BODY_BYTES = 32 * 1024

const DISALLOWED_KEYS = new Set([
  'workspace_id',
  'automation_id',
  'provider',
  'sender',
  'content_sid',
  'twilio_content_sid',
  'twilio_whatsapp_from',
  'twilio_account_sid',
  'twilio_auth_token',
  'twilio_api_key_sid',
  'twilio_api_key_secret',
  'cron_secret',
  'max_attempts',
  'scheduled_for',
])

export type ValidLeadPayload = {
  name: string
  phone: string
  email: string | null
  company: string | null
  position: string | null
  tags: string[]
  customFields: Record<string, unknown>
  externalLeadId: string | null
  source: string | null
  whatsappOptIn: boolean
  whatsappOptInAt: string | null
  whatsappOptInText: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

export function isObjectPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function validateLeadPayload(value: unknown): { payload?: ValidLeadPayload; error?: string } {
  if (!isObjectPayload(value)) return { error: 'Payload JSON invalido.' }

  const forbidden = Object.keys(value).find((key) => DISALLOWED_KEYS.has(key.toLowerCase()))
  if (forbidden) return { error: `Campo nao permitido: ${forbidden}.` }

  const name = normalizeOptionalString(value.name, 160)
  if (!name) return { error: 'Nome obrigatorio.' }

  const phone = normalizeBrazilianPhone(value.phone, true)
  if (phone.error || !phone.phone) return { error: phone.error ?? 'Telefone invalido.' }

  const email = normalizeEmail(value.email)
  if (email.error) return { error: email.error }

  if (typeof value.whatsapp_opt_in !== 'boolean') {
    return { error: 'whatsapp_opt_in deve ser boolean.' }
  }

  const whatsappOptInText = normalizeOptionalString(value.whatsapp_opt_in_text, 1000)
  if (value.whatsapp_opt_in === true && !whatsappOptInText) {
    return { error: 'whatsapp_opt_in_text obrigatorio quando whatsapp_opt_in = true.' }
  }

  const whatsappOptInAtRaw = normalizeOptionalString(value.whatsapp_opt_in_at, 80)
  if (whatsappOptInAtRaw) {
    const parsed = new Date(whatsappOptInAtRaw)
    if (Number.isNaN(parsed.getTime())) return { error: 'whatsapp_opt_in_at invalido.' }
  }

  const tags = normalizeTags(value.tags ?? [])
  if (tags.error) return { error: tags.error }

  const customFields = normalizeCustomFields(value.custom_fields ?? {})
  if (customFields.error) return { error: customFields.error }

  return {
    payload: {
      name,
      phone: phone.phone,
      email: email.email,
      company: normalizeOptionalString(value.company, 160),
      position: normalizeOptionalString(value.position, 120),
      tags: tags.tags,
      customFields: customFields.customFields,
      externalLeadId: normalizeOptionalString(value.external_lead_id, 200),
      source: normalizeOptionalString(value.source, 120),
      whatsappOptIn: value.whatsapp_opt_in,
      whatsappOptInAt: whatsappOptInAtRaw,
      whatsappOptInText,
      utmSource: normalizeOptionalString(value.utm_source, 200),
      utmMedium: normalizeOptionalString(value.utm_medium, 200),
      utmCampaign: normalizeOptionalString(value.utm_campaign, 200),
      utmContent: normalizeOptionalString(value.utm_content, 200),
      utmTerm: normalizeOptionalString(value.utm_term, 200),
    },
  }
}

export function validateOrigin(origin: string | null, allowedOrigins: string[] | null | undefined): boolean {
  if (!origin) return true
  const allowed = allowedOrigins ?? []
  if (allowed.length === 0) return true
  return allowed.includes(origin)
}
