import { normalizeTwilioWhatsAppAddress } from '@/lib/whatsapp/providers'

export const DEFAULT_LUCCA_TIME_ZONE = 'America/Sao_Paulo'
export const DEFAULT_LUCCA_START_HOUR = 18
export const DEFAULT_LUCCA_END_HOUR = 8
export const DEFAULT_LUCCA_NOTIFICATION_TO = 'whatsapp:+5582996932970'

function enabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'sim', 'on'].includes((value ?? '').trim().toLowerCase())
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback
}

export type LuccaConfig = ReturnType<typeof getLuccaConfig>

export function getLuccaConfig() {
  return {
    enabled: enabled(process.env.LUCCA_WHATSAPP_ENABLED),
    workspaceId: process.env.LUCCA_WORKSPACE_ID?.trim() ?? '',
    whatsappFrom: normalizeTwilioWhatsAppAddress(process.env.LUCCA_WHATSAPP_FROM),
    alwaysOn: enabled(process.env.LUCCA_ALWAYS_ON),
    timeZone: process.env.LUCCA_TIME_ZONE?.trim() || DEFAULT_LUCCA_TIME_ZONE,
    startHour: boundedInteger(process.env.LUCCA_START_HOUR, DEFAULT_LUCCA_START_HOUR, 0, 23),
    endHour: boundedInteger(process.env.LUCCA_END_HOUR, DEFAULT_LUCCA_END_HOUR, 0, 23),
    openAiModel: process.env.LUCCA_OPENAI_MODEL?.trim() || 'gpt-5.6-sol',
    openAiTimeoutMs: boundedInteger(process.env.LUCCA_OPENAI_TIMEOUT_MS, 8_000, 1_000, 30_000),
    openAiMaxRetries: boundedInteger(process.env.LUCCA_OPENAI_MAX_RETRIES, 1, 0, 2),
    openAiMaxOutputTokens: boundedInteger(process.env.LUCCA_OPENAI_MAX_OUTPUT_TOKENS, 1_000, 200, 1_000),
    maxInputCharacters: boundedInteger(process.env.LUCCA_MAX_INPUT_CHARACTERS, 4_000, 500, 12_000),
    maxOutputCharacters: boundedInteger(process.env.LUCCA_MAX_OUTPUT_CHARACTERS, 900, 200, 2_000),
    workerBatchSize: boundedInteger(process.env.LUCCA_WORKER_BATCH_SIZE, 2, 1, 5),
    maxAttempts: boundedInteger(process.env.LUCCA_MAX_ATTEMPTS, 3, 1, 5),
    jobLeaseSeconds: boundedInteger(process.env.LUCCA_JOB_LEASE_SECONDS, 180, 30, 900),
    retryBaseSeconds: boundedInteger(process.env.LUCCA_RETRY_BASE_SECONDS, 45, 10, 600),
    attributionLookbackDays: boundedInteger(process.env.LUCCA_UTM_LOOKBACK_DAYS, 30, 1, 180),
    notificationTo: normalizeTwilioWhatsAppAddress(
      process.env.LUCCA_NOTIFICATION_TO || DEFAULT_LUCCA_NOTIFICATION_TO
    ),
    notificationContentSid: process.env.LUCCA_NOTIFICATION_CONTENT_SID?.trim() ?? '',
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, ''),
    approvedQcmInfo: (process.env.LUCCA_APPROVED_QCM_INFO ?? '').trim().slice(0, 2_000),
  }
}

export function isLuccaWorkspaceEligible(params: {
  workspaceId: string
  sender: string
  config?: LuccaConfig
}): boolean {
  const config = params.config ?? getLuccaConfig()
  if (!config.enabled || !config.workspaceId || !config.whatsappFrom) return false
  return (
    params.workspaceId === config.workspaceId &&
    normalizeTwilioWhatsAppAddress(params.sender) === config.whatsappFrom
  )
}

export function isCaioNotificationNumber(address: string, config: LuccaConfig = getLuccaConfig()) {
  return Boolean(
    config.notificationTo &&
      normalizeTwilioWhatsAppAddress(address) === config.notificationTo
  )
}
