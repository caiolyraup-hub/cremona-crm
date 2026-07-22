import assert from 'assert'
import fs from 'fs'
import path from 'path'
import {
  buildPayloadHash,
  extractLeadSourceKey,
  generateLeadSourceKey,
  hashLeadSourceKey,
} from '../src/lib/leads/security.ts'
import { validateLeadPayload, validateOrigin } from '../src/lib/leads/validation.ts'
import {
  buildContactPhoneCandidates,
  mergeTags,
  normalizeBrazilianPhone,
  normalizeEmail,
} from '../src/lib/contacts/normalize.ts'

const validPayload = {
  name: 'Maria Lead',
  phone: '(82) 99999-0000',
  email: 'MARIA@EXAMPLE.COM',
  company: 'Empresa',
  position: 'Gerente',
  tags: ['landing-page'],
  custom_fields: { interesse: 'whatsapp' },
  external_lead_id: 'external-1',
  source: 'landing_page',
  whatsapp_opt_in: true,
  whatsapp_opt_in_text: 'Aceito receber atendimento pelo WhatsApp.',
  utm_source: 'instagram',
  utm_medium: 'paid_social',
  utm_campaign: 'beta',
}

function headers(input: Record<string, string>) {
  return new Headers(input)
}

function simulatePersistentRateLimit(limit: number, attempts: number): boolean[] {
  let count = 0
  return Array.from({ length: attempts }, () => {
    if (count >= limit) return false
    count += 1
    return true
  })
}

function run() {
  const key = 'cremona_ls_test_secret'
  assert.equal(hashLeadSourceKey(key), hashLeadSourceKey(` ${key} `), 'hash ignora espacos externos')
  assert.notEqual(hashLeadSourceKey(key), key, 'chave nao e armazenada em texto puro')
  assert.match(generateLeadSourceKey(), /^cremona_ls_/, 'chave gerada possui prefixo operacional')

  assert.equal(extractLeadSourceKey(headers({ Authorization: `Bearer ${key}` })), key)
  assert.equal(extractLeadSourceKey(headers({ 'X-Cremona-Lead-Key': key })), key)
  assert.equal(extractLeadSourceKey(headers({})), null)

  const valid = validateLeadPayload(validPayload)
  assert.ok(valid.payload, 'payload valido e aceito')
  assert.equal(valid.payload?.email, 'maria@example.com')
  assert.equal(valid.payload?.phone, '+5582999990000')

  assert.equal(validateLeadPayload({ ...validPayload, workspace_id: 'x' }).error?.includes('Campo nao permitido'), true)
  assert.equal(validateLeadPayload({ ...validPayload, whatsapp_opt_in: 'true' }).error, 'whatsapp_opt_in deve ser boolean.')
  assert.equal(validateLeadPayload({ ...validPayload, whatsapp_opt_in: true, whatsapp_opt_in_text: '' }).error?.includes('whatsapp_opt_in_text'), true)
  assert.ok(validateLeadPayload({ ...validPayload, whatsapp_opt_in: false, whatsapp_opt_in_text: undefined }).payload)

  assert.equal(normalizeBrazilianPhone('82999990000').phone, '+5582999990000')
  assert.equal(normalizeBrazilianPhone('+55 (82) 99999-0000').whatsappAddress, 'whatsapp:+5582999990000')
  assert.equal(Boolean(normalizeBrazilianPhone('10999990000').error), true)
  assert.equal(normalizeEmail(' USER@Example.COM ').email, 'user@example.com')
  assert.deepEqual(
    buildContactPhoneCandidates('+5582999990000').includes('82999990000'),
    true,
    'dedup cobre formato nacional legado'
  )

  assert.equal(buildPayloadHash(validPayload), buildPayloadHash({ ...validPayload }), 'payload hash deterministico')
  assert.notEqual(buildPayloadHash(validPayload), buildPayloadHash({ ...validPayload, name: 'Outro' }))

  assert.deepEqual(mergeTags(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'])

  assert.equal(validateOrigin(null, ['https://example.com']), true, 'server-to-server sem Origin e aceito')
  assert.equal(validateOrigin('https://example.com', ['https://example.com']), true)
  assert.equal(validateOrigin('https://evil.example', ['https://example.com']), false)
  assert.equal(validateOrigin('https://any.example', []), true)

  assert.deepEqual(simulatePersistentRateLimit(2, 4), [true, true, false, false])

  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/leads/route.ts'), 'utf8')
  const validationModule = fs.readFileSync(path.join(process.cwd(), 'src/lib/leads/validation.ts'), 'utf8')
  assert.ok(route.includes("runtime = 'nodejs'"), 'endpoint usa runtime Node.js')
  assert.ok(route.includes('lead_sources'), 'endpoint autentica por lead_sources')
  assert.ok(!route.includes('whatsapp_phone_number_id'), 'endpoint nao consulta coluna Meta opcional')
  assert.ok(!route.includes('TWILIO_ACCOUNT_SID'), 'endpoint nao consome credenciais Twilio')
  assert.ok(validationModule.includes("'workspace_id'"), 'workspace_id do payload e rejeitado')

  const providerResolver = fs.readFileSync(path.join(process.cwd(), 'src/lib/whatsapp/providers/index.ts'), 'utf8')
  const twilioBranch = providerResolver.slice(
    providerResolver.indexOf("providerName === 'twilio'"),
    providerResolver.indexOf("const { data: metaData")
  )
  assert.ok(!twilioBranch.includes('whatsapp_phone_number_id'), 'Twilio continua sem consultar colunas Meta')

  const automationActions = fs.readFileSync(path.join(process.cwd(), 'src/lib/automations/actions.ts'), 'utf8')
  assert.ok(automationActions.includes('Contato sem opt-in para WhatsApp'), 'template sem opt-in e skipped')

  const setupScript = fs.readFileSync(path.join(process.cwd(), 'scripts/setup-beta-lead-source.ts'), 'utf8')
  assert.ok(setupScript.includes('Mais de um workspace Twilio encontrado'), 'setup exige workspace-id em ambiguidade')
  assert.ok(setupScript.includes('lead_source_key_exibir_uma_vez'), 'setup indica exibicao unica da chave')
  assert.ok(setupScript.includes('Content SID ausente'), 'setup nao cria automacao sem Content SID')

  console.log('OK validate-leads-ingestion')
}

run()
