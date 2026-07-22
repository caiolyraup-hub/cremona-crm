import { createClient } from '@supabase/supabase-js'
import { generateLeadSourceKey, hashLeadSourceKey } from '../src/lib/leads/security.ts'

type Args = {
  email?: string
  workspaceId?: string
  sourceName: string
  sourceSlug: string
  allowedOrigin?: string
  ensureWelcomeAutomation: boolean
  rotateKey: boolean
  deactivate: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    sourceName: 'Formulario Beta Cremona',
    sourceSlug: 'beta-cremona',
    ensureWelcomeAutomation: false,
    rotateKey: false,
    deactivate: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--email') args.email = argv[++i]
    else if (arg === '--workspace-id') args.workspaceId = argv[++i]
    else if (arg === '--source-name') args.sourceName = argv[++i]
    else if (arg === '--source-slug') args.sourceSlug = argv[++i]
    else if (arg === '--allowed-origin') args.allowedOrigin = argv[++i]
    else if (arg === '--ensure-welcome-automation') args.ensureWelcomeAutomation = true
    else if (arg === '--rotate-key') args.rotateKey = true
    else if (arg === '--deactivate') args.deactivate = true
  }

  return args
}

function requireEnv(key: string): string {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} nao configurado.`)
  return value
}

async function findUserIdByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  let page = 1
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())
    if (user) return user.id
    if (data.users.length < 1000) break
    page++
  }
  return null
}

async function ensureWelcomeAutomation(params: {
  supabase: ReturnType<typeof createClient>
  workspaceId: string
  contentSid: string | null
}) {
  const { data: existing, error } = await params.supabase
    .from('automations')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('trigger_type', 'contact_created')
    .eq('action_type', 'send_whatsapp_template')
    .eq('active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (existing?.id) {
    console.log(`Automacao existente: ${existing.id}`)
    return
  }

  if (!params.contentSid) {
    throw new Error('Content SID ausente. Configure twilio_content_sid_new_lead no workspace ou TWILIO_CONTENT_SID_NEW_LEAD.')
  }

  const { data: created, error: createError } = await params.supabase
    .from('automations')
    .insert({
      workspace_id: params.workspaceId,
      name: 'Boas-vindas novo lead - Twilio',
      trigger_type: 'contact_created',
      trigger_config: {},
      action_type: 'send_whatsapp_template',
      action_config: {
        content_sid: params.contentSid,
        variables: JSON.stringify({ '1': '{{contact_name}}' }),
      },
      delay_minutes: 0,
      active: true,
    })
    .select('id')
    .maybeSingle()

  if (createError) throw createError
  console.log(`Automacao criada: ${created?.id}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.email) {
    throw new Error('Use --email para localizar o proprietario do workspace beta.')
  }

  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  )

  const userId = await findUserIdByEmail(supabase, args.email)
  if (!userId) throw new Error('Usuario nao encontrado.')

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)

  if (membershipError) throw membershipError
  const workspaceIds = (memberships ?? []).map((membership) => membership.workspace_id)
  if (workspaceIds.length === 0) throw new Error('Usuario nao possui workspace_members.')

  const { data: workspaces, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id, name, whatsapp_provider, twilio_whatsapp_from, twilio_content_sid_new_lead')
    .in('id', workspaceIds)

  if (workspaceError) throw workspaceError
  const twilioWorkspaces = (workspaces ?? [])
    .filter((workspace) => workspace.whatsapp_provider === 'twilio' && workspace.twilio_whatsapp_from)

  const selected = args.workspaceId
    ? twilioWorkspaces.find((workspace) => workspace.id === args.workspaceId)
    : twilioWorkspaces.length === 1
      ? twilioWorkspaces[0]
      : null

  if (!selected) {
    if (twilioWorkspaces.length > 1) {
      throw new Error('Mais de um workspace Twilio encontrado. Informe --workspace-id.')
    }
    throw new Error('Nenhum workspace Twilio valido encontrado para este usuario.')
  }

  const allowedOrigins = args.allowedOrigin ? [args.allowedOrigin] : []
  const { data: existingSource, error: sourceError } = await supabase
    .from('lead_sources')
    .select('id, active')
    .eq('workspace_id', selected.id)
    .eq('slug', args.sourceSlug)
    .maybeSingle()

  if (sourceError) throw sourceError

  let sourceId = existingSource?.id as string | undefined
  let plainKey: string | null = null

  if (existingSource?.id) {
    const updates: Record<string, unknown> = {
      name: args.sourceName,
      allowed_origins: allowedOrigins,
      active: !args.deactivate,
      updated_at: new Date().toISOString(),
    }

    if (args.rotateKey) {
      plainKey = generateLeadSourceKey()
      updates.key_hash = hashLeadSourceKey(plainKey)
    }

    const { error: updateError } = await supabase
      .from('lead_sources')
      .update(updates)
      .eq('id', existingSource.id)
      .eq('workspace_id', selected.id)

    if (updateError) throw updateError
  } else {
    if (args.deactivate) throw new Error('Nao ha lead source existente para desativar.')
    plainKey = generateLeadSourceKey()
    const { data: created, error: createError } = await supabase
      .from('lead_sources')
      .insert({
        workspace_id: selected.id,
        name: args.sourceName,
        slug: args.sourceSlug,
        key_hash: hashLeadSourceKey(plainKey),
        allowed_origins: allowedOrigins,
      })
      .select('id')
      .maybeSingle()

    if (createError) throw createError
    sourceId = created?.id as string | undefined
  }

  if (args.ensureWelcomeAutomation && !args.deactivate) {
    await ensureWelcomeAutomation({
      supabase,
      workspaceId: selected.id,
      contentSid: selected.twilio_content_sid_new_lead || process.env.TWILIO_CONTENT_SID_NEW_LEAD?.trim() || null,
    })
  }

  console.log(`workspace_id: ${selected.id}`)
  console.log(`workspace_name: ${selected.name}`)
  console.log(`source_id: ${sourceId}`)
  console.log(`source_slug: ${args.sourceSlug}`)
  console.log(`active: ${!args.deactivate}`)
  if (plainKey) {
    console.log('lead_source_key_exibir_uma_vez:')
    console.log(plainKey)
  } else {
    console.log('lead_source_key: existente; use --rotate-key para gerar uma nova.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
