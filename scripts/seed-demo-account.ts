/**
 * Populates a demo workspace with realistic Brazilian CRM data.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-account.ts [WORKSPACE_ID]
 *   npm run seed:demo -- [WORKSPACE_ID]
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
  console.error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.')
  process.exit(1)
}

if (!workspaceId) {
  console.error('Uso: npx tsx scripts/seed-demo-account.ts [WORKSPACE_ID]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stageDefaults = [
  { name: 'Novo lead', color: '#378ADD', position: 1 },
  { name: 'Contato feito', color: '#22C55E', position: 2 },
  { name: 'Proposta enviada', color: '#F59E0B', position: 3 },
  { name: 'Negociação', color: '#8B5CF6', position: 4 },
  { name: 'Fechado', color: '#10B981', position: 5 },
]

const contactSeeds = [
  { name: 'Ana Beatriz Santos', phone: '5511987650001', email: 'ana@ateliedaana.example', company: 'Ateliê da Ana', tags: ['quente', 'vip'] },
  { name: 'Carlos Eduardo Lima', phone: '5511987650002', email: 'carlos@autopecaslima.example', company: 'Auto Peças Lima', tags: ['quente'] },
  { name: 'Fernanda Oliveira', phone: '5511987650003', email: 'fernanda@studiofepilates.example', company: 'Studio Fê Pilates', tags: ['indicação'] },
  { name: 'Ricardo Mendes', phone: '5511987650004', email: 'ricardo@construtoramendes.example', company: 'Construtora Mendes', tags: ['quente'] },
  { name: 'Juliana Costa', phone: '5511987650005', email: 'juliana@doceriadaju.example', company: 'Doceria da Ju', tags: ['cliente'] },
  { name: 'Paulo Roberto Silva', phone: '5511987650006', email: 'paulo@prsconsultoria.example', company: 'PRS Consultoria', tags: ['vip'] },
  { name: 'Mariana Ferreira', phone: '5511987650007', email: 'mariana@esteticamari.example', company: 'Clínica Estética Mari', tags: ['quente', 'indicação'] },
  { name: 'Bruno Alves', phone: '5511987650008', email: 'bruno@barbeariadobruno.example', company: 'Barbearia Do Bruno', tags: ['cliente'] },
  { name: 'Camila Rodrigues', phone: '5511987650009', email: 'camila@confeitariarodrigues.example', company: 'Confeitaria Rodrigues', tags: ['frio'] },
  { name: 'Thiago Santos', phone: '5511987650010', email: 'thiago@techhelp.example', company: 'TechHelp Informática', tags: ['quente'] },
  { name: 'Larissa Martins', phone: '5511987650011', email: 'larissa@idiomaslm.example', company: 'Escola de Idiomas LM', tags: ['indicação'] },
  { name: 'Felipe Nascimento', phone: '5511987650012', email: 'felipe@fnarquitetura.example', company: 'FN Arquitetura', tags: ['cliente'] },
  { name: 'Aline Pereira', phone: '5511987650013', email: 'aline@appetshop.example', company: 'AP Pet Shop', tags: ['cliente', 'vip'] },
  { name: 'Gustavo Ribeiro', phone: '5511987650014', email: 'gustavo@academiaribeiro.example', company: 'Academia Ribeiro', tags: ['cliente'] },
  { name: 'Patrícia Lima', phone: '5511987650015', email: 'patricia@plimoveis.example', company: 'PL Imóveis', tags: ['cliente', 'indicação'] },
]

const stageDistribution = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 4]

function dateDaysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function isoHoursAgo(hours: number) {
  const date = new Date()
  date.setHours(date.getHours() - hours)
  return date.toISOString()
}

function saleDate(daysAgo: number) {
  return dateDaysFromNow(-daysAgo)
}

async function ensureWorkspaceExists() {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single()

  if (error || !data) {
    console.error('Workspace nao encontrado:', workspaceId)
    process.exit(1)
  }
}

async function ensurePipelineStages() {
  const { data: existingStages, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Erro ao buscar pipeline stages:', error.message)
    process.exit(1)
  }

  if (existingStages && existingStages.length > 0) {
    return existingStages
  }

  const { data: createdStages, error: insertError } = await supabase
    .from('pipeline_stages')
    .insert(stageDefaults.map(stage => ({ ...stage, workspace_id: workspaceId })))
    .select('id, name, position')
    .order('position', { ascending: true })

  if (insertError || !createdStages) {
    console.error('Erro ao criar pipeline stages:', insertError?.message)
    process.exit(1)
  }

  return createdStages
}

async function main() {
  await ensureWorkspaceExists()
  const stages = await ensurePipelineStages()

  if (stages.length < 5) {
    console.error('O workspace precisa ter pelo menos 5 pipeline stages para distribuir os contatos.')
    process.exit(1)
  }

  const { data: insertedContacts, error: contactError } = await supabase
    .from('contacts')
    .insert(contactSeeds.map((contact, index) => ({
      workspace_id: workspaceId,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      company: contact.company,
      tags: contact.tags,
      pipeline_stage_id: stages[stageDistribution[index]].id,
      notes: 'Contato criado para demonstração do Cremona.',
    })))
    .select('id, name')

  if (contactError || !insertedContacts) {
    console.error('Erro ao inserir contatos:', contactError?.message)
    process.exit(1)
  }

  const contactIds = insertedContacts.map(contact => contact.id)

  const sales = [
    { contact: 0, product_name: 'Consultoria inicial', value: 350, status: 'paid', daysAgo: 42, payment_method: 'pix' },
    { contact: 1, product_name: 'Pacote mensal', value: 890, status: 'paid', daysAgo: 38, payment_method: 'cartao' },
    { contact: 2, product_name: 'Projeto completo', value: 2400, status: 'pending', daysAgo: 31, payment_method: 'boleto' },
    { contact: 3, product_name: 'Servico avulso', value: 180, status: 'paid', daysAgo: 28, payment_method: 'pix' },
    { contact: 4, product_name: 'Renovacao', value: 650, status: 'paid', daysAgo: 21, payment_method: 'pix' },
    { contact: 5, product_name: 'Pacote mensal', value: 890, status: 'paid', daysAgo: 17, payment_method: 'cartao' },
    { contact: 6, product_name: 'Consultoria inicial', value: 350, status: 'pending', daysAgo: 12, payment_method: 'boleto' },
    { contact: 7, product_name: 'Projeto completo', value: 2400, status: 'paid', daysAgo: 9, payment_method: 'pix' },
    { contact: 0, product_name: 'Servico avulso', value: 180, status: 'cancelled', daysAgo: 6, payment_method: 'pix' },
    { contact: 1, product_name: 'Renovacao', value: 650, status: 'paid', daysAgo: 2, payment_method: 'cartao' },
  ]

  const { error: salesError } = await supabase.from('sales').insert(
    sales.map(sale => ({
      workspace_id: workspaceId,
      contact_id: contactIds[sale.contact],
      product_name: sale.product_name,
      value: sale.value,
      status: sale.status,
      payment_method: sale.payment_method,
      sale_date: saleDate(sale.daysAgo),
      notes: 'Venda criada para demonstração.',
    }))
  )

  if (salesError) {
    console.error('Erro ao inserir vendas:', salesError.message)
    process.exit(1)
  }

  const tasks = [
    { contact: 3, title: 'Ligar para Ricardo sobre proposta', dueOffset: -2, priority: 'high' },
    { contact: 2, title: 'Enviar contrato para Fernanda', dueOffset: -2, priority: 'high' },
    { contact: 0, title: 'Follow-up Ana Beatriz', dueOffset: 0, priority: 'medium' },
    { contact: 4, title: 'Enviar orçamento Juliana', dueOffset: 0, priority: 'medium' },
    { contact: 1, title: 'Confirmar reunião Carlos', dueOffset: 0, priority: 'medium' },
    { contact: 7, title: 'Apresentação para Bruno', dueOffset: 2, priority: 'medium' },
    { contact: 6, title: 'Revisão contrato Mariana', dueOffset: 3, priority: 'high' },
    { contact: 5, title: 'Check-in semanal Paulo', dueOffset: 5, priority: 'low' },
  ]

  const { error: tasksError } = await supabase.from('tasks').insert(
    tasks.map(task => ({
      workspace_id: workspaceId,
      contact_id: contactIds[task.contact],
      title: task.title,
      priority: task.priority,
      due_date: dateDaysFromNow(task.dueOffset),
    }))
  )

  if (tasksError) {
    console.error('Erro ao inserir tarefas:', tasksError.message)
    process.exit(1)
  }

  const messages = [
    { contact: 0, direction: 'inbound', content: 'Oi! Vi seus serviços e queria saber mais sobre o pacote mensal', hoursAgo: 30 },
    { contact: 0, direction: 'outbound', content: 'Olá Ana! Que ótimo. Posso te explicar tudo. Quando tem um tempinho?', hoursAgo: 29 },
    { contact: 0, direction: 'inbound', content: 'Pode ser amanhã às 14h?', hoursAgo: 28 },
    { contact: 3, direction: 'inbound', content: 'Bom dia! Queria retomar nossa conversa', hoursAgo: 22 },
    { contact: 3, direction: 'outbound', content: 'Bom dia Fernanda! Claro, preparei uma proposta nova para você', hoursAgo: 21 },
    { contact: 6, direction: 'outbound', content: 'Oi Mariana! Passando para ver se recebeu o orçamento que enviei', hoursAgo: 8 },
    { contact: 6, direction: 'inbound', content: 'Recebi sim! Estou analisando, te retorno hoje', hoursAgo: 7 },
  ]

  const { error: messagesError } = await supabase.from('messages').insert(
    messages.map((message, index) => ({
      workspace_id: workspaceId,
      contact_id: contactIds[message.contact],
      whatsapp_message_id: `demo-${workspaceId}-${Date.now()}-${index}`,
      direction: message.direction,
      content: message.content,
      media_type: 'text',
      status: message.direction === 'inbound' ? 'received' : 'sent',
      created_at: isoHoursAgo(message.hoursAgo),
    }))
  )

  if (messagesError) {
    console.error('Erro ao inserir mensagens:', messagesError.message)
    process.exit(1)
  }

  console.log('✓ 15 contatos criados')
  console.log('✓ 10 vendas registradas')
  console.log('✓ 8 tarefas criadas')
  console.log('✓ 3 conversas simuladas')
  console.log('Demo account pronta para gravação ✓')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
