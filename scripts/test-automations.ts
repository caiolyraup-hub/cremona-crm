/**
 * Smoke checks for the automation sprint.
 *
 * Usage:
 *   npm run test:automations -- [WORKSPACE_ID]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const workspaceId = process.argv[2]

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

if (!workspaceId) {
  console.error('Usage: npm run test:automations -- [WORKSPACE_ID]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function ok(name: string) {
  console.log(`OK ${name}`)
}

function fail(name: string, expected: string, received: unknown) {
  console.error(`FALHOU ${name}`)
  console.error(`  esperado: ${expected}`)
  console.error(`  recebido: ${JSON.stringify(received)}`)
  process.exitCode = 1
}

async function run() {
  const { data: automations } = await (supabase as any)
    .from('automations')
    .select('id, trigger_type, action_type, action_config, active')
    .eq('workspace_id', workspaceId)
    .eq('active', true)

  if (!automations?.length) {
    fail('automacoes ativas', 'pelo menos uma automacao ativa no workspace', automations)
    return
  }
  ok('automacoes ativas encontradas')

  const contactCreated = automations.find((a: any) => a.trigger_type === 'contact_created')
  if (!contactCreated) fail('contact_created', 'automacao contact_created ativa', automations.map((a: any) => a.trigger_type))
  else ok('contact_created configurado')

  const stageEnter = automations.find((a: any) => a.trigger_type === 'stage_enter')
  if (!stageEnter) fail('stage_enter', 'automacao stage_enter ativa', automations.map((a: any) => a.trigger_type))
  else ok('stage_enter configurado')

  const { data: recentSkipped } = await (supabase as any)
    .from('automation_logs')
    .select('id, status, error_message')
    .eq('workspace_id', workspaceId)
    .eq('status', 'skipped')
    .ilike('error_message', '%duplicada%')
    .order('executed_at', { ascending: false })
    .limit(1)

  if (!recentSkipped?.length) {
    fail('deduplicacao', 'um log skipped de execucao duplicada apos mover o mesmo contato duas vezes', recentSkipped)
  } else {
    ok('deduplicacao registrada')
  }

  const textAutomation = automations.find((a: any) =>
    a.action_type === 'send_whatsapp_text' && a.action_config?.message?.includes('{{contact_name}}')
  )
  const taskAutomation = automations.find((a: any) =>
    a.action_type === 'create_task' && a.action_config?.title?.includes('{{contact_name}}')
  )

  if (!textAutomation && !taskAutomation) {
    fail('interpolacao', 'uma automacao com {{contact_name}} em message ou title', automations.map((a: any) => a.action_config))
  } else {
    ok('interpolacao configurada')
  }
}

void run()
