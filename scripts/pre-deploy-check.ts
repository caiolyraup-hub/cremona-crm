import { existsSync, readFileSync } from 'fs'
import path from 'path'

const root = process.cwd()

const envPath = path.join(root, '.env.local')
if (existsSync(envPath)) {
  const envSource = readFileSync(envPath, 'utf-8')
  for (const line of envSource.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  }
}

interface CheckResult {
  label: string
  ok: boolean
  warning?: string
  critical: boolean
}

function check(label: string, critical: boolean, fn: () => boolean | string): CheckResult {
  try {
    const result = fn()
    if (result === true) return { label, ok: true, critical }
    if (typeof result === 'string') return { label, ok: true, warning: result, critical }
    return { label, ok: false, critical }
  } catch (err) {
    return { label, ok: false, warning: String(err), critical }
  }
}

const checks: CheckResult[] = [

  // 1. Variáveis de ambiente críticas
  check('Variaveis de ambiente criticas existem', true, () => {
    const required = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'WHATSAPP_VERIFY_TOKEN',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_APP_URL',
    ]
    const missing = required.filter((k) => !process.env[k]?.trim())
    if (missing.length > 0) {
      console.error('  Faltando:', missing.join(', '))
      return false
    }
    return true
  }),

  // 2. Migrations SQL existem
  check('Migrations SQL existem (001-007)', true, () => {
    const files = [
      '001_initial_schema.sql',
      '002_soft_delete.sql',
      '003_search_indexes.sql',
      '004_dashboard_indexes.sql',
      '005_onboarding.sql',
      '006_whatsapp_config.sql',
      '007_stripe.sql',
    ]
    const missing = files.filter(
      (f) => !existsSync(path.join(root, 'supabase', 'migrations', f))
    )
    if (missing.length > 0) {
      console.error('  Faltando:', missing.join(', '))
      return false
    }
    return true
  }),

  // 3. Arquivos críticos de API existem
  check('Arquivos criticos de API existem', true, () => {
    const files = [
      'app/api/whatsapp/webhook/route.ts',
      'app/api/stripe/webhook/route.ts',
      'app/api/stripe/checkout/route.ts',
      'app/api/stripe/portal/route.ts',
    ]
    const missing = files.filter((f) => !existsSync(path.join(root, f)))
    if (missing.length > 0) {
      console.error('  Faltando:', missing.join(', '))
      return false
    }
    return true
  }),

  // 4. Price IDs do Stripe (aviso, não erro)
  check('STRIPE_PLANS com priceIds configurados', false, () => {
    const starter = process.env.STRIPE_PRICE_STARTER?.trim()
    const pro = process.env.STRIPE_PRICE_PROFESSIONAL?.trim()
    if (!starter || !pro) {
      const missing = [
        !starter && 'STRIPE_PRICE_STARTER',
        !pro && 'STRIPE_PRICE_PROFESSIONAL',
      ]
        .filter(Boolean)
        .join(', ')
      console.warn(`  Aviso: ${missing} nao configurados — checkout nao funcionara ate preencher.`)
      return `priceIds nao configurados: ${missing}`
    }
    return true
  }),

  // 5. CREMONA_TEMPLATES tem pelo menos 1 template
  check('CREMONA_TEMPLATES tem pelo menos 1 template', true, () => {
    const filePath = path.join(root, 'lib', 'whatsapp', 'template-definitions.ts')
    if (!existsSync(filePath)) {
      console.error('  template-definitions.ts nao encontrado')
      return false
    }
    const src = readFileSync(filePath, 'utf-8')
    if (!src.includes('buildTemplate:')) {
      console.error('  CREMONA_TEMPLATES parece vazio (nenhum buildTemplate encontrado)')
      return false
    }
    return true
  }),

  // 6. CRON_SECRET protege o endpoint do Vercel Cron
  check('CRON_SECRET configurada', true, () => {
    if (!process.env.CRON_SECRET?.trim()) {
      console.error('  Faltando: CRON_SECRET')
      return false
    }
    return true
  }),

  // 7. vercel.json contem configuracao de cron
  check('vercel.json existe com cron configurado', true, () => {
    const filePath = path.join(root, 'vercel.json')
    if (!existsSync(filePath)) {
      console.error('  vercel.json nao encontrado')
      return false
    }
    const config = JSON.parse(readFileSync(filePath, 'utf-8')) as {
      crons?: Array<{ path?: string; schedule?: string }>
    }
    const cron = config.crons?.find((item) => item.path === '/api/cron/process-automation-queue')
    if (!cron?.schedule) {
      console.error('  Cron /api/cron/process-automation-queue nao configurado')
      return false
    }
    return true
  }),

  // 8. Bucket outbound-media referenciado na migration 008
  check('Bucket outbound-media referenciado na migration 008', true, () => {
    const filePath = path.join(root, 'supabase', 'migrations', '008_media_storage.sql')
    if (!existsSync(filePath)) {
      console.error('  008_media_storage.sql nao encontrado')
      return false
    }
    const src = readFileSync(filePath, 'utf-8')
    if (!src.includes('outbound-media')) {
      console.error('  outbound-media nao encontrado na migration 008')
      return false
    }
    return true
  }),

  // 9. Migrations do Sprint WhatsApp existem
  check('Migrations 008 a 013 existem', true, () => {
    const files = [
      '008_media_storage.sql',
      '009_automations.sql',
      '010_custom_templates.sql',
      '011_automation_media.sql',
      '012_automation_queue.sql',
      '013_whatsapp_indexes.sql',
    ]
    const missing = files.filter(
      (f) => !existsSync(path.join(root, 'supabase', 'migrations', f))
    )
    if (missing.length > 0) {
      console.error('  Faltando:', missing.join(', '))
      return false
    }
    return true
  }),
]

// — Output —

const width = 58
console.log('\nPre-deploy Check — Cremona')
console.log('='.repeat(width))
let hasError = false
let hasWarning = false
let okCount = 0

for (const result of checks) {
  const icon = result.ok ? '✓' : result.critical ? '✗' : '⚠'
  const suffix = result.warning ? ` (${result.warning})` : ''
  console.log(`${icon}  ${result.label}${suffix}`)
  if (result.ok) okCount += 1
  if (!result.ok && result.critical) hasError = true
  if (result.warning) hasWarning = true
}

console.log('='.repeat(width))
console.log(`${okCount}/${checks.length} verificacoes OK`)

if (hasError) {
  console.log('\nCorrigir antes do deploy ✗\n')
  process.exit(1)
} else if (hasWarning) {
  console.log('\nDeploy possivel com avisos ⚠\n')
} else {
  console.log('\nPronto para deploy ✓\n')
}
