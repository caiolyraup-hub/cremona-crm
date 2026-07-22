/**
 * End-to-end smoke checks for Sprint WhatsApp MVP.
 *
 * Usage:
 *   npx tsx scripts/test-whatsapp-sprint.ts [WORKSPACE_ID]
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { existsSync, readFileSync } from 'fs'
import { runAutomationsForEvent } from '../lib/automations/engine'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const workspaceId = process.argv[2]

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

if (!workspaceId) {
  console.error('Uso: npx tsx scripts/test-whatsapp-sprint.ts [WORKSPACE_ID]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

type TestResult = {
  name: string
  ok: boolean
  details?: string
}

const results: TestResult[] = []

function record(name: string, ok: boolean, details?: string) {
  results.push({ name, ok, details })
  console.log(`${ok ? 'OK' : 'FALHOU'} ${name}${details ? ` - ${details}` : ''}`)
}

function readProjectFile(filePath: string) {
  return readFileSync(path.resolve(process.cwd(), filePath), 'utf-8')
}

async function cleanup(ids: {
  automationIds?: string[]
  contactIds?: string[]
}) {
  const automationIds = ids.automationIds ?? []
  const contactIds = ids.contactIds ?? []

  if (automationIds.length > 0) {
    await (supabase as any).from('automation_queue').delete().in('automation_id', automationIds)
    await (supabase as any).from('automation_logs').delete().in('automation_id', automationIds)
    await (supabase as any).from('automations').delete().in('id', automationIds)
  }

  if (contactIds.length > 0) {
    await (supabase as any).from('tasks').delete().in('contact_id', contactIds)
    await (supabase as any).from('messages').delete().in('contact_id', contactIds)
    await (supabase as any).from('contacts').delete().in('id', contactIds)
  }
}

async function createAutomation(params: {
  name: string
  actionType: string
  actionConfig: Record<string, unknown>
  delayMinutes?: number
}) {
  const { data, error } = await (supabase as any)
    .from('automations')
    .insert({
      workspace_id: workspaceId,
      name: params.name,
      trigger_type: 'contact_created',
      trigger_config: {},
      action_type: params.actionType,
      action_config: params.actionConfig,
      active: true,
      delay_minutes: params.delayMinutes ?? 0,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as { id: string }
}

async function createContact(phoneSuffix: string) {
  const { data, error } = await (supabase as any)
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      name: 'Contato Teste Sprint',
      phone: `55119999${phoneSuffix}`,
      tags: [],
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as { id: string }
}

async function testMediaInfrastructure() {
  try {
    const bucket = await supabase.storage.getBucket('outbound-media')
    if (bucket.error) throw new Error(`Bucket outbound-media indisponivel: ${bucket.error.message}`)

    const inboxActions = readProjectFile('app/(dashboard)/dashboard/inbox/actions.ts')
    if (!inboxActions.includes('sendMediaMessageAction')) {
      throw new Error('sendMediaMessageAction nao encontrado em inbox/actions.ts')
    }

    const mediaUpload = readProjectFile('lib/whatsapp/media-upload.ts')
    if (!mediaUpload.includes('uploadOutboundMedia')) {
      throw new Error('uploadOutboundMedia nao exportado em lib/whatsapp/media-upload.ts')
    }

    record('Infraestrutura de midia', true, 'Bucket e exports OK')
  } catch (err) {
    record('Infraestrutura de midia', false, String(err))
  }
}

async function testAutomationEngine() {
  const automationIds: string[] = []
  const contactIds: string[] = []
  try {
    const automation = await createAutomation({
      name: '__test_automation_engine__',
      actionType: 'create_task',
      actionConfig: { title: 'Teste {{contact_name}}', priority: 'medium', days_offset: '0' },
    })
    const contact = await createContact('0001')
    automationIds.push(automation.id)
    contactIds.push(contact.id)

    await runAutomationsForEvent({
      type: 'contact_created',
      workspaceId,
      contactId: contact.id,
    })

    const { data: log } = await (supabase as any)
      .from('automation_logs')
      .select('*')
      .eq('automation_id', automation.id)
      .eq('contact_id', contact.id)
      .order('executed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!log) throw new Error('Nenhum log criado')
    if (!['success', 'skipped'].includes(log.status)) throw new Error(`Status inesperado: ${log.status}`)

    const { data: task } = await (supabase as any)
      .from('tasks')
      .select('title')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (log.status === 'success' && task?.title?.includes('{{contact_name}}')) {
      throw new Error('Interpolacao manteve {{contact_name}} literal')
    }

    record('Motor de automacoes', true, `Log ${log.status}`)
  } catch (err) {
    record('Motor de automacoes', false, String(err))
  } finally {
    await cleanup({ automationIds, contactIds })
  }
}

async function testDelayQueue() {
  const automationIds: string[] = []
  const contactIds: string[] = []
  try {
    const automation = await createAutomation({
      name: '__test_automation_delay__',
      actionType: 'create_task',
      actionConfig: { title: 'Delay {{contact_name}}', priority: 'medium', days_offset: '0' },
      delayMinutes: 1,
    })
    const contact = await createContact('0002')
    automationIds.push(automation.id)
    contactIds.push(contact.id)

    await runAutomationsForEvent({
      type: 'contact_created',
      workspaceId,
      contactId: contact.id,
    })

    const { data: queue } = await (supabase as any)
      .from('automation_queue')
      .select('*')
      .eq('automation_id', automation.id)
      .eq('contact_id', contact.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (!queue) throw new Error('Item nao entrou em automation_queue')

    const { data: log } = await (supabase as any)
      .from('automation_logs')
      .select('*')
      .eq('automation_id', automation.id)
      .eq('contact_id', contact.id)
      .eq('status', 'skipped')
      .ilike('error_message', '%Agendada%')
      .maybeSingle()

    if (!log) throw new Error('Log de agendamento skipped nao encontrado')

    record('Fila de delay', true, 'Queue pending e log de agendamento OK')
  } catch (err) {
    record('Fila de delay', false, String(err))
  } finally {
    await cleanup({ automationIds, contactIds })
  }
}

async function testDeduplication() {
  const automationIds: string[] = []
  const contactIds: string[] = []
  try {
    const automation = await createAutomation({
      name: '__test_automation_dedup__',
      actionType: 'create_task',
      actionConfig: { title: 'Dedup {{contact_name}}', priority: 'medium', days_offset: '0' },
    })
    const contact = await createContact('0003')
    automationIds.push(automation.id)
    contactIds.push(contact.id)

    const event = { type: 'contact_created' as const, workspaceId, contactId: contact.id }
    await runAutomationsForEvent(event)
    await runAutomationsForEvent(event)

    const { data: logs } = await (supabase as any)
      .from('automation_logs')
      .select('status, error_message')
      .eq('automation_id', automation.id)
      .eq('contact_id', contact.id)

    const successCount = (logs ?? []).filter((log: any) => log.status === 'success').length
    const skippedCount = (logs ?? []).filter((log: any) => log.status === 'skipped').length

    if (successCount !== 1 || skippedCount !== 1) {
      throw new Error(`Esperado 1 success e 1 skipped; recebido ${successCount} success e ${skippedCount} skipped`)
    }

    record('Deduplicacao', true, '1 success e 1 skipped')
  } catch (err) {
    record('Deduplicacao', false, String(err))
  } finally {
    await cleanup({ automationIds, contactIds })
  }
}

async function testSchema() {
  try {
    const tables = ['automation_queue', 'automation_logs', 'automations', 'whatsapp_templates']
    for (const table of tables) {
      const { error } = await (supabase as any).from(table).select('id').limit(1)
      if (error) throw new Error(`Tabela ${table}: ${error.message}`)
    }

    const migration012 = readProjectFile('supabase/migrations/012_automation_queue.sql')
    const migration013 = readProjectFile('supabase/migrations/013_whatsapp_indexes.sql')
    const requiredIndexHints = [
      'automation_queue',
      'messages',
      'automation_logs',
    ]

    for (const hint of requiredIndexHints) {
      if (!migration012.includes(hint) && !migration013.includes(hint)) {
        throw new Error(`Indice critico nao referenciado nas migrations: ${hint}`)
      }
    }

    record('Schema do banco', true, 'Tabelas no banco e migrations de indices OK')
  } catch (err) {
    record('Schema do banco', false, String(err))
  }
}

async function main() {
  console.log('\nSmoke test Sprint WhatsApp MVP')
  console.log('='.repeat(40))

  await testMediaInfrastructure()
  await testAutomationEngine()
  await testDelayQueue()
  await testDeduplication()
  await testSchema()

  const passed = results.filter((result) => result.ok).length
  console.log('='.repeat(40))
  console.log(`${passed}/${results.length} testes passaram`)

  if (passed !== results.length) {
    process.exitCode = 1
  }
}

void main()
