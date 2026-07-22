/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeAutomationError } from '@/lib/automations/retry'
import { createMetaCloudProvider } from './meta-cloud'
import { createTwilioProvider, validateTwilioProviderConfig } from './twilio'
import type {
  ResolvedWhatsAppWorkspace,
  SendWhatsAppResult,
  WhatsAppProvider,
  WhatsAppProviderName,
} from './types'

export type { WhatsAppProviderName, SendWhatsAppResult, WhatsAppProvider }
export type { SendMediaInput, SendTemplateInput, SendTextInput, WhatsAppSendContext } from './types'
export { normalizeTwilioWhatsAppAddress, classifyTwilioError, validateTwilioProviderConfig } from './twilio'

export async function getWhatsAppProviderForWorkspace(
  workspaceId: string
): Promise<{ provider: WhatsAppProvider | null; workspace: ResolvedWhatsAppWorkspace | null; error?: SendWhatsAppResult }> {
  const supabase = createAdminClient()
  const { data, error } = await (supabase as any)
    .from('workspaces')
    .select(
      [
        'id',
        'whatsapp_provider',
        'whatsapp_phone_number_id',
        'whatsapp_business_account_id',
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

  const workspace = data as ResolvedWhatsAppWorkspace | null
  if (!workspace) {
    return {
      provider: null,
      workspace: null,
      error: { success: false, retryable: false, error: 'Automacao inexistente ou workspace nao encontrado.' },
    }
  }

  const providerName = (workspace.whatsapp_provider ?? 'meta_cloud') as WhatsAppProviderName
  if (providerName === 'twilio') {
    const config = validateTwilioProviderConfig(workspace)
    if (!config.success) {
      return { provider: null, workspace, error: config }
    }
    return { provider: createTwilioProvider(workspace), workspace }
  }

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
