import twilio from 'twilio'
import type {
  ResolvedWhatsAppWorkspace,
  SendMediaInput,
  SendTemplateInput,
  SendTextInput,
  SendWhatsAppResult,
  WhatsAppProvider,
} from './types'

type TwilioMessage = {
  sid?: string
  status?: string
}

type TwilioError = {
  status?: number
  code?: number | string
  message?: string
}

function getRequiredEnv(key: string): string {
  return process.env[key]?.trim() ?? ''
}

export function normalizeTwilioWhatsAppAddress(value: string | null | undefined): string {
  const raw = value?.trim() ?? ''
  if (!raw) return ''
  if (raw.toLowerCase().startsWith('whatsapp:')) {
    const number = raw.slice('whatsapp:'.length).replace(/[^\d+]/g, '')
    return number ? `whatsapp:${number.startsWith('+') ? number : `+${number}`}` : ''
  }

  const digits = raw.replace(/\D/g, '')
  return digits ? `whatsapp:+${digits}` : ''
}

function validateHttpsPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && parsed.hostname !== 'localhost'
  } catch {
    return false
  }
}

export function classifyTwilioError(error: unknown): SendWhatsAppResult {
  const err = error as TwilioError
  const status = typeof err.status === 'number' ? err.status : undefined
  const code = err.code ? String(err.code) : undefined
  const message = (err.message ?? 'Erro ao enviar mensagem pela Twilio.').slice(0, 500)
  const lower = message.toLowerCase()

  if (
    !status &&
    (lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('socket hang up') ||
      lower.includes('econnreset') ||
      lower.includes('etimedout') ||
      lower.includes('network'))
  ) {
    return { success: false, retryable: false, deliveryUnknown: true, error: message, errorCode: code }
  }

  if (status === 429 || [500, 502, 503, 504].includes(status ?? 0)) {
    return { success: false, retryable: true, error: message, errorCode: code }
  }

  if (status === 401 || status === 403) {
    return { success: false, retryable: false, error: 'Credenciais Twilio recusadas ou insuficientes.', errorCode: code }
  }

  if (
    status === 400 ||
    lower.includes('invalid') ||
    lower.includes('not a valid') ||
    lower.includes('content sid') ||
    lower.includes('from') ||
    lower.includes('to')
  ) {
    return { success: false, retryable: false, error: message, errorCode: code }
  }

  return { success: false, retryable: status ? false : true, error: message, errorCode: code }
}

function getTwilioClient() {
  const accountSid = getRequiredEnv('TWILIO_ACCOUNT_SID')
  const apiKeySid = getRequiredEnv('TWILIO_API_KEY_SID')
  const apiKeySecret = getRequiredEnv('TWILIO_API_KEY_SECRET')

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    return {
      error: 'Credenciais Twilio de envio nao configuradas.',
      client: null,
    }
  }

  return {
    error: null,
    client: twilio(apiKeySid, apiKeySecret, { accountSid }),
  }
}

function requireTwilioConfig(workspace: ResolvedWhatsAppWorkspace) {
  const sender = normalizeTwilioWhatsAppAddress(
    workspace.twilio_whatsapp_from || getRequiredEnv('TWILIO_WHATSAPP_FROM')
  )
  const statusCallback = getRequiredEnv('TWILIO_STATUS_CALLBACK_URL')
  const authToken = getRequiredEnv('TWILIO_AUTH_TOKEN')
  const { client, error } = getTwilioClient()

  if (error || !client) return { error, client: null, sender, statusCallback }
  if (!authToken) return { error: 'TWILIO_AUTH_TOKEN nao configurado para validacao de webhooks.', client: null, sender, statusCallback }
  if (!sender) return { error: 'Sender Twilio do workspace nao configurado.', client: null, sender, statusCallback }
  if (!statusCallback) return { error: 'TWILIO_STATUS_CALLBACK_URL nao configurada.', client: null, sender, statusCallback }

  return { error: null, client, sender, statusCallback }
}

function acceptedResult(message: TwilioMessage): SendWhatsAppResult {
  return {
    success: true,
    messageId: message.sid,
    providerStatus: message.status ?? 'accepted',
  }
}

export function createTwilioProvider(workspace: ResolvedWhatsAppWorkspace): WhatsAppProvider {
  return {
    name: 'twilio',
    async sendText(input: SendTextInput): Promise<SendWhatsAppResult> {
      const config = requireTwilioConfig(workspace)
      if (config.error || !config.client) return { success: false, retryable: false, error: config.error ?? 'Twilio nao configurada.' }

      const to = normalizeTwilioWhatsAppAddress(input.to)
      const body = input.text.trim()
      if (!to) return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      if (!body) return { success: false, retryable: false, error: 'Mensagem vazia.' }

      try {
        const message = await config.client.messages.create({
          from: config.sender,
          to,
          body,
          statusCallback: config.statusCallback,
        })
        return acceptedResult(message as TwilioMessage)
      } catch (error) {
        return classifyTwilioError(error)
      }
    },
    async sendTemplate(input: SendTemplateInput): Promise<SendWhatsAppResult> {
      const config = requireTwilioConfig(workspace)
      if (config.error || !config.client) return { success: false, retryable: false, error: config.error ?? 'Twilio nao configurada.' }

      const to = normalizeTwilioWhatsAppAddress(input.to)
      const contentSid = input.contentSid?.trim() || workspace.twilio_content_sid_new_lead?.trim() || getRequiredEnv('TWILIO_CONTENT_SID_NEW_LEAD')
      if (!to) return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      if (!contentSid) return { success: false, retryable: false, error: 'Content SID Twilio ausente para envio de template.' }

      try {
        const message = await config.client.messages.create({
          from: config.sender,
          to,
          contentSid,
          contentVariables: JSON.stringify(input.contentVariables ?? {}),
          statusCallback: config.statusCallback,
        })
        return acceptedResult(message as TwilioMessage)
      } catch (error) {
        return classifyTwilioError(error)
      }
    },
    async sendMedia(input: SendMediaInput): Promise<SendWhatsAppResult> {
      const config = requireTwilioConfig(workspace)
      if (config.error || !config.client) return { success: false, retryable: false, error: config.error ?? 'Twilio nao configurada.' }

      const to = normalizeTwilioWhatsAppAddress(input.to)
      if (!to) return { success: false, retryable: false, skipped: true, error: 'Telefone invalido para WhatsApp.' }
      if (!validateHttpsPublicUrl(input.mediaUrl)) {
        return {
          success: false,
          retryable: false,
          error: 'URL publica HTTPS da midia e obrigatoria para envio via Twilio.',
        }
      }

      try {
        const message = await config.client.messages.create({
          from: config.sender,
          to,
          body: input.caption?.trim() || undefined,
          mediaUrl: [input.mediaUrl],
          statusCallback: config.statusCallback,
        })
        return acceptedResult(message as TwilioMessage)
      } catch (error) {
        return classifyTwilioError(error)
      }
    },
  }
}

export function validateTwilioProviderConfig(workspace: ResolvedWhatsAppWorkspace): SendWhatsAppResult {
  const config = requireTwilioConfig(workspace)
  if (config.error || !config.client) return { success: false, retryable: false, error: config.error ?? 'Twilio nao configurada.' }
  return { success: true, providerStatus: 'configured' }
}
