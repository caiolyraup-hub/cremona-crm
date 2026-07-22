/**
 * Seeds 3 default WhatsApp templates for a workspace.
 *
 * Usage:
 *   node --experimental-strip-types scripts/seed-default-templates.ts [WORKSPACE_ID]
 *   npm run seed:templates -- [WORKSPACE_ID]
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
  console.error('Usage: node --experimental-strip-types scripts/seed-default-templates.ts [WORKSPACE_ID]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const TEMPLATES = [
  {
    workspace_id: workspaceId,
    name: 'cremona_follow_up',
    display_name: 'Follow-up pós-visita',
    language: 'pt_BR',
    category: 'UTILITY',
    body_text: 'Olá {{1}}, tudo bem? Passando para saber se ficou alguma dúvida após nossa conversa. Fico à disposição para ajudar!',
    variables: [
      { index: 1, label: 'Nome do cliente', default: '{{contact_name}}' },
    ],
    status: 'approved',
  },
  {
    workspace_id: workspaceId,
    name: 'cremona_proposta',
    display_name: 'Envio de proposta',
    language: 'pt_BR',
    category: 'UTILITY',
    body_text: 'Olá {{1}}! Segue a proposta que preparamos para você da empresa {{2}}. Qualquer dúvida, é só chamar.',
    variables: [
      { index: 1, label: 'Nome do cliente', default: '{{contact_name}}' },
      { index: 2, label: 'Empresa do cliente', default: '{{contact_company}}' },
    ],
    status: 'approved',
  },
  {
    workspace_id: workspaceId,
    name: 'cremona_reativacao',
    display_name: 'Reativação de lead',
    language: 'pt_BR',
    category: 'MARKETING',
    body_text: 'Oi {{1}}, tudo bem? Faz um tempo que não conversamos! Temos novidades que podem interessar a você. Posso te contar mais?',
    variables: [
      { index: 1, label: 'Nome do cliente', default: '{{contact_name}}' },
    ],
    status: 'pending',
  },
]

async function run() {
  console.log(`Seeding ${TEMPLATES.length} templates for workspace ${workspaceId}…`)

  for (const tpl of TEMPLATES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('whatsapp_templates')
      .upsert(tpl, { onConflict: 'workspace_id,name' })

    if (error) {
      console.error(`  ✗ ${tpl.name}: ${error.message}`)
    } else {
      console.log(`  ✓ ${tpl.name} (${tpl.status})`)
    }
  }

  console.log('Done.')
}

void run()
