/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '../../supabase/admin'
import { sanitizeAutomationError } from '../../automations/retry'
import { createMetaCloudProvider } from './meta-cloud'
import { createTwilioProvider, validateTwilioProviderConfig } from './twilio'
import type {
  ResolvedWhatsAppWorkspace,
  SendWhatsAppResult,
  WhatsAppProvider,
  WhatsAppProviderName,
} from './types'

type ProviderSupabaseClient = ReturnType<typeof createAdminClient>

type MinimalProviderWorkspace = Pick<
  ResolvedWhatsAppWorkspace,
  | 'id'
  | 'whatsapp_provider'
  | 'whatsapp_phone'
  | 'whatsapp_token'
  | 'twilio_whatsapp_from'
  | 'twilio_content_sid_new_lead'
>

function withMissingMetaColumns(workspace: MinimalProviderWorkspace): ResolvedWhatsAppWorkspace {
  return {
    ...workspace,
    whatsapp_phone_number_id: null,
    whatsapp_business_account_id: null,
  }
}

function isMissingMetaColumnError(error: { message?: string | null } | null | undefined): boolean {
  const message = error?.message?.toLowerCase()
  if (!message) return false
  const mentionsMetaColumn =
    message.includes('whatsapp_phone_number_id') ||
    message.includes('whatsapp_business_account_id')

  return (
    mentionsMetaColumn &&
    (message.includes('schema cache') ||
      message.includes('column') ||
      message.includes('does not exist') ||
      message.includes('could not find'))
  )
}

export type { WhatsAppProviderName, SendWhatsAppResult, WhatsAppProvider }
export type { SendMediaInput, SendTemplateInput, SendTextInput, WhatsAppSendContext } from './types'
export { normalizeTwilioWhatsAppAddress, classifyTwilioError, validateTwilioProviderConfig } from './twilio'

export async function getWhatsAppProviderForWorkspace(
  workspaceId: string,
  client?: ProviderSupabaseClient
): Promise<{ provider: WhatsAppProvider | null; workspace: ResolvedWhatsAppWorkspace | null; error?: SendWhatsAppResult }> {
  const supabase = client ?? createAdminClient()
  const { data, error } = await (supabase as any)
    .from('workspaces')
    .select(
      [
        'id',
        'whatsapp_provider',
        'whatsapp_phone',
        'whatsapp_token',
        'twilio_whatsapp_from',
        'twilio_content_sid_new_lead',
      ].join(', ')
    )
    .eq('id', workspaceId)
    .maybeSingle()

  if (error) {
    return {
      provider: null,
      workspace: null,
      error: { success: false, retryable: true, error: sanitizeAutomationError(error.message) },
    }
  }

  const minimalWorkspace = data as MinimalProviderWorkspace | null
  if (!minimalWorkspace) {
    return {
      provider: null,
      workspace: null,
      error: { success: false, retryable: false, error: 'Automacao inexistente ou workspace nao encontrado.' },
    }
  }

  const providerName = (minimalWorkspace.whatsapp_provider ?? 'meta_cloud') as WhatsAppProviderName
  if (providerName === 'twilio') {
    const workspace = withMissingMetaColumns(minimalWorkspace)
    const config = validateTwilioProviderConfig(workspace)
    if (!config.success) {
      return { provider: null, workspace, error: config }
    }
    return { provider: createTwilioProvider(workspace), workspace }
  }

  const { data: metaData, error: metaError } = await (supabase as any)
    .from('workspaces')
    .select('whatsapp_phone_number_id, whatsapp_business_account_id')
    .eq('id', workspaceId)
    .maybeSingle()

  if (metaError) {
    const workspace = withMissingMetaColumns(minimalWorkspace)
    return {
      provider: null,
      workspace,
      error: {
        success: false,
        skipped: true,
        retryable: false,
        error: isMissingMetaColumnError(metaError)
          ? 'Schema Meta Cloud API incompleto para este workspace.'
          : sanitizeAutomationError(metaError.message),
      },
    }
  }

  const workspace = {
    ...minimalWorkspace,
    whatsapp_phone_number_id: metaData?.whatsapp_phone_number_id ?? null,
    whatsapp_business_account_id: metaData?.whatsapp_business_account_id ?? null,
  } as ResolvedWhatsAppWorkspace

  if (!workspace.whatsapp_phone_number_id || !workspace.whatsapp_token) {
    return {
      provider: null,
      workspace,
      error: {
        success: false,
        skipped: true,
        retryable: false,
        error: 'Workspace sem provedor Meta Cloud API configurado.',
      },
    }
  }

  return { provider: createMetaCloudProvider(workspace), workspace }
}
