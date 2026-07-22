import { env } from '@/lib/env'

export function getWhatsAppEnvStatus(): {
  hasVerifyToken: boolean
  hasAppSecret: boolean
  isReadyForWebhookVerification: boolean
  warnings: string[]
} {
  const hasVerifyToken = Boolean(env.whatsapp.verifyToken)
  const hasAppSecret = Boolean(env.whatsapp.appSecret)
  const warnings: string[] = []

  if (!hasVerifyToken) warnings.push('WHATSAPP_VERIFY_TOKEN nao configurado.')
  if (!hasAppSecret) {
    warnings.push('WHATSAPP_APP_SECRET nao configurado. A validacao HMAC nao funcionara em producao.')
  }

  return { hasVerifyToken, hasAppSecret, isReadyForWebhookVerification: hasVerifyToken, warnings }
}
