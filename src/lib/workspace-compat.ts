import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/database'

const WORKSPACE_CORE_SELECT = [
  'id',
  'name',
  'slug',
  'owner_id',
  'whatsapp_phone',
  'whatsapp_token',
  'plan',
  'trial_ends_at',
  'created_at',
].join(', ')

const WORKSPACE_WHATSAPP_CONFIG_SELECT = [
  'whatsapp_phone_number_id',
  'whatsapp_business_account_id',
  'whatsapp_provider',
  'twilio_whatsapp_from',
  'twilio_content_sid_new_lead',
].join(', ')

const WORKSPACE_ONBOARDING_SELECT = [
  'onboarding_completed',
  'business_name',
  'business_type',
  'logo_url',
].join(', ')

const WORKSPACE_STRIPE_SELECT = [
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'subscription_status',
  'subscription_ends_at',
].join(', ')

const WORKSPACE_SELECT_FULL = [
  WORKSPACE_CORE_SELECT,
  WORKSPACE_WHATSAPP_CONFIG_SELECT,
  WORKSPACE_ONBOARDING_SELECT,
  WORKSPACE_STRIPE_SELECT,
].join(', ')

const WORKSPACE_SELECT_WITH_ONBOARDING = [
  WORKSPACE_CORE_SELECT,
  WORKSPACE_ONBOARDING_SELECT,
].join(', ')

const WORKSPACE_SELECT_WITH_WHATSAPP_CONFIG = [
  WORKSPACE_CORE_SELECT,
  WORKSPACE_WHATSAPP_CONFIG_SELECT,
].join(', ')

const ONBOARDING_COLUMNS = [
  'onboarding_completed',
  'business_name',
  'business_type',
  'logo_url',
] as const

const WHATSAPP_CONFIG_COLUMNS = [
  'whatsapp_phone_number_id',
  'whatsapp_business_account_id',
  'whatsapp_provider',
  'twilio_whatsapp_from',
  'twilio_content_sid_new_lead',
] as const

const STRIPE_COLUMNS = [
  'stripe_customer_id',
  'stripe_subscription_id',
  'stripe_price_id',
  'subscription_status',
  'subscription_ends_at',
] as const

type DatabaseClient = SupabaseClient<Database>

type WorkspaceCoreRow = Pick<
  Tables<'workspaces'>,
  | 'id'
  | 'name'
  | 'slug'
  | 'owner_id'
  | 'whatsapp_phone'
  | 'whatsapp_token'
  | 'plan'
  | 'trial_ends_at'
  | 'created_at'
>

type WorkspaceWithOnboardingRow = WorkspaceCoreRow &
  Pick<
    Tables<'workspaces'>,
    'onboarding_completed' | 'business_name' | 'business_type' | 'logo_url'
  >

type WorkspaceWithWhatsappConfigRow = WorkspaceCoreRow &
  Pick<
    Tables<'workspaces'>,
    | 'whatsapp_phone_number_id'
    | 'whatsapp_business_account_id'
    | 'whatsapp_provider'
    | 'twilio_whatsapp_from'
    | 'twilio_content_sid_new_lead'
  >

export type WorkspaceCompatibilityResult = {
  workspace: Tables<'workspaces'> | null
  error: PostgrestError | null
  usesLegacyOnboardingSchema: boolean
  usesLegacyWhatsAppConfigSchema: boolean
}

export async function getWorkspaceIdForUser(
  supabase: DatabaseClient,
  userId: string
): Promise<{ workspaceId: string | null; error: PostgrestError | null }> {
  const { data, error } = (await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()) as {
    data: { workspace_id: string } | null
    error: PostgrestError | null
  }

  return {
    workspaceId: data?.workspace_id ?? null,
    error,
  }
}

function isMissingColumnsError(
  error: Pick<PostgrestError, 'message'> | null | undefined,
  columns: readonly string[]
): boolean {
  const message = error?.message?.toLowerCase()
  if (!message) return false

  const mentionsColumn = columns.some((column) => message.includes(column))
  if (!mentionsColumn) return false

  return (
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('does not exist') ||
    message.includes('could not find')
  )
}

export function isMissingOnboardingSchemaError(
  error: Pick<PostgrestError, 'message'> | null | undefined
): boolean {
  return isMissingColumnsError(error, ONBOARDING_COLUMNS)
}

export function isMissingWhatsAppConfigSchemaError(
  error: Pick<PostgrestError, 'message'> | null | undefined
): boolean {
  return isMissingColumnsError(error, WHATSAPP_CONFIG_COLUMNS)
}

export function isMissingStripeSchemaError(
  error: Pick<PostgrestError, 'message'> | null | undefined
): boolean {
  return isMissingColumnsError(error, STRIPE_COLUMNS)
}

function withLegacyDefaults(
  workspace: WorkspaceCoreRow,
  options?: {
    onboarding?: Partial<
      Pick<
        Tables<'workspaces'>,
        'onboarding_completed' | 'business_name' | 'business_type' | 'logo_url'
      >
    >
    whatsappConfig?: Partial<
      Pick<
        Tables<'workspaces'>,
        | 'whatsapp_phone_number_id'
        | 'whatsapp_business_account_id'
        | 'whatsapp_provider'
        | 'twilio_whatsapp_from'
        | 'twilio_content_sid_new_lead'
      >
    >
    stripe?: Partial<
      Pick<
        Tables<'workspaces'>,
        | 'stripe_customer_id'
        | 'stripe_subscription_id'
        | 'stripe_price_id'
        | 'subscription_status'
        | 'subscription_ends_at'
      >
    >
  }
): Tables<'workspaces'> {
  return {
    ...workspace,
    whatsapp_phone_number_id: options?.whatsappConfig?.whatsapp_phone_number_id ?? null,
    whatsapp_business_account_id:
      options?.whatsappConfig?.whatsapp_business_account_id ?? null,
    whatsapp_provider: options?.whatsappConfig?.whatsapp_provider ?? 'meta_cloud',
    twilio_whatsapp_from: options?.whatsappConfig?.twilio_whatsapp_from ?? null,
    twilio_content_sid_new_lead: options?.whatsappConfig?.twilio_content_sid_new_lead ?? null,
    onboarding_completed: options?.onboarding?.onboarding_completed ?? true,
    business_name: options?.onboarding?.business_name ?? null,
    business_type: options?.onboarding?.business_type ?? null,
    logo_url: options?.onboarding?.logo_url ?? null,
    stripe_customer_id: options?.stripe?.stripe_customer_id ?? null,
    stripe_subscription_id: options?.stripe?.stripe_subscription_id ?? null,
    stripe_price_id: options?.stripe?.stripe_price_id ?? null,
    subscription_status: options?.stripe?.subscription_status ?? null,
    subscription_ends_at: options?.stripe?.subscription_ends_at ?? null,
  }
}

export async function getWorkspaceByIdCompatible(
  supabase: DatabaseClient,
  workspaceId: string
): Promise<WorkspaceCompatibilityResult> {
  const fullResult = (await supabase
    .from('workspaces')
    .select(WORKSPACE_SELECT_FULL)
    .eq('id', workspaceId)
    .maybeSingle()) as {
    data: Tables<'workspaces'> | null
    error: PostgrestError | null
  }

  if (fullResult.data) {
    return {
      workspace: fullResult.data,
      error: null,
      usesLegacyOnboardingSchema: false,
      usesLegacyWhatsAppConfigSchema: false,
    }
  }

  const missingOnboarding = isMissingOnboardingSchemaError(fullResult.error)
  const missingWhatsAppConfig = isMissingWhatsAppConfigSchemaError(fullResult.error)
  const missingStripe = isMissingStripeSchemaError(fullResult.error)

  if (fullResult.error && !missingOnboarding && !missingWhatsAppConfig && !missingStripe) {
    return {
      workspace: null,
      error: fullResult.error,
      usesLegacyOnboardingSchema: false,
      usesLegacyWhatsAppConfigSchema: false,
    }
  }

  if (missingWhatsAppConfig) {
    const onboardingResult = (await supabase
      .from('workspaces')
      .select(WORKSPACE_SELECT_WITH_ONBOARDING)
      .eq('id', workspaceId)
      .maybeSingle()) as {
      data: WorkspaceWithOnboardingRow | null
      error: PostgrestError | null
    }

    if (onboardingResult.data) {
      return {
        workspace: withLegacyDefaults(onboardingResult.data, {
          onboarding: {
            onboarding_completed: onboardingResult.data.onboarding_completed,
            business_name: onboardingResult.data.business_name,
            business_type: onboardingResult.data.business_type,
            logo_url: onboardingResult.data.logo_url,
          },
        }),
        error: null,
        usesLegacyOnboardingSchema: false,
        usesLegacyWhatsAppConfigSchema: true,
      }
    }

    if (onboardingResult.error && !isMissingOnboardingSchemaError(onboardingResult.error)) {
      return {
        workspace: null,
        error: onboardingResult.error,
        usesLegacyOnboardingSchema: false,
        usesLegacyWhatsAppConfigSchema: true,
      }
    }
  }

  if (missingOnboarding) {
    const whatsappConfigResult = (await supabase
      .from('workspaces')
      .select(WORKSPACE_SELECT_WITH_WHATSAPP_CONFIG)
      .eq('id', workspaceId)
      .maybeSingle()) as {
      data: WorkspaceWithWhatsappConfigRow | null
      error: PostgrestError | null
    }

    if (whatsappConfigResult.data) {
      return {
        workspace: withLegacyDefaults(whatsappConfigResult.data, {
          whatsappConfig: {
            whatsapp_phone_number_id: whatsappConfigResult.data.whatsapp_phone_number_id,
            whatsapp_business_account_id:
              whatsappConfigResult.data.whatsapp_business_account_id,
            whatsapp_provider: whatsappConfigResult.data.whatsapp_provider,
            twilio_whatsapp_from: whatsappConfigResult.data.twilio_whatsapp_from,
            twilio_content_sid_new_lead: whatsappConfigResult.data.twilio_content_sid_new_lead,
          },
        }),
        error: null,
        usesLegacyOnboardingSchema: true,
        usesLegacyWhatsAppConfigSchema: false,
      }
    }

    if (
      whatsappConfigResult.error &&
      !isMissingWhatsAppConfigSchemaError(whatsappConfigResult.error)
    ) {
      return {
        workspace: null,
        error: whatsappConfigResult.error,
        usesLegacyOnboardingSchema: true,
        usesLegacyWhatsAppConfigSchema: false,
      }
    }
  }

  const coreResult = (await supabase
    .from('workspaces')
    .select(WORKSPACE_CORE_SELECT)
    .eq('id', workspaceId)
    .maybeSingle()) as {
    data: WorkspaceCoreRow | null
    error: PostgrestError | null
  }

  if (coreResult.error) {
    return {
      workspace: null,
      error: coreResult.error,
      usesLegacyOnboardingSchema: true,
      usesLegacyWhatsAppConfigSchema: true,
    }
  }

  return {
    workspace: coreResult.data ? withLegacyDefaults(coreResult.data) : null,
    error: null,
    usesLegacyOnboardingSchema: true,
    usesLegacyWhatsAppConfigSchema: true,
  }
}
