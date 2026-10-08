import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  asksForHuman,
  asksToStop,
  buildFallbackReply,
  buildInitialFallbackReply,
  buildReception,
  containsEmoji,
  isDirectAiQuestion,
  sanitizeFirstName,
} from '../src/lib/whatsapp/lucca/messages'
import { extractTwilioReferral } from '../src/lib/whatsapp/lucca/inbound'
import { getLuccaConfig, isCaioNotificationNumber, isLuccaWorkspaceEligible } from '../src/lib/whatsapp/lucca/config'
import { getGreeting, isWithinLuccaWindow } from '../src/lib/whatsapp/lucca/time'
import {
  deterministicExtraction,
  getNextQualificationAction,
  mergeQualificationState,
  type LuccaInterpretation,
  type QualificationState,
} from '../src/lib/whatsapp/lucca/state'
import {
  buildLuccaInstructions,
  parseLuccaInterpretation,
  validateLuccaReply,
} from '../src/lib/whatsapp/lucca/openai'

const zone = 'America/Sao_Paulo'
const at = (local: string) => new Date(`${local}-03:00`)
const active = (local: string) => isWithinLuccaWindow(at(local), { timeZone: zone, startHour: 18, endHour: 8 })

assert.equal(active('2026-10-06T17:59:00'), false)
assert.equal(active('2026-10-06T18:00:00'), true)
assert.equal(active('2026-10-06T23:59:00'), true)
assert.equal(active('2026-10-07T04:59:00'), true)
assert.equal(active('2026-10-07T05:00:00'), true)
assert.equal(active('2026-10-07T07:59:00'), true)
assert.equal(active('2026-10-07T08:00:00'), false)
const alwaysActive = (local: string) => isWithinLuccaWindow(at(local), {
  alwaysOn: true,
  timeZone: zone,
  startHour: 18,
  endHour: 8,
})
assert.equal(alwaysActive('2026-10-06T17:59:00'), true)
assert.equal(alwaysActive('2026-10-07T08:00:00'), true)
assert.equal(alwaysActive('2026-10-07T12:00:00'), true)
assert.equal(getGreeting(at('2026-10-07T05:00:00'), zone), 'Bom dia')
assert.equal(getGreeting(at('2026-10-06T12:00:00'), zone), 'Boa tarde')
assert.equal(getGreeting(at('2026-10-06T18:00:00'), zone), 'Boa noite')

assert.equal(sanitizeFirstName('João da Silva'), 'João')
assert.equal(sanitizeFirstName('whatsapp:+5582999999999'), null)
assert.equal(sanitizeFirstName('QCM Digital Ltda'), null)
assert.equal(sanitizeFirstName('Pet Shop Feliz'), null)

const receptions = [
  buildReception({ date: at('2026-10-06T18:00:00'), timeZone: zone, firstName: 'João', treatment: 'male' }),
  buildReception({ date: at('2026-10-07T05:00:00'), timeZone: zone, firstName: 'Maria', treatment: 'female' }),
  buildReception({ date: at('2026-10-06T18:00:00'), timeZone: zone, firstName: 'Alex', treatment: 'neutral' }),
  buildReception({ date: at('2026-10-06T18:00:00'), timeZone: zone, firstName: null, treatment: 'neutral' }),
]
assert.match(receptions[0], /Aqui é o Lucca, da QCM/)
assert.match(receptions[0], /bem-vindo/)
assert.match(receptions[1], /bem-vinda/)
assert.match(receptions[2], /Que bom receber você/)
assert.doesNotMatch(receptions[3], /undefined|null/)
for (const message of receptions) assert.equal(containsEmoji(message), false)

const allFallbacks = ['city', 'digital_experience', 'team_size', 'complete', 'handoff', 'stop', 'clarify'] as const
for (const nextAction of allFallbacks) {
  const message = buildInitialFallbackReply({
    date: at('2026-10-06T18:00:00'), timeZone: zone, firstName: 'Alex', treatment: 'neutral', nextAction,
  })
  assert.equal(containsEmoji(message), false)
  assert.match(message, /Lucca/)
}
assert.equal(containsEmoji('Olá! 👋'), true)
assert.equal(isDirectAiQuestion('Você é uma inteligência artificial?'), true)
assert.equal(asksForHuman('Quero falar com uma pessoa'), true)
assert.equal(asksToStop('Pare de me mandar mensagens'), true)
assert.equal(validateLuccaReply({
  reply: 'Sou um assistente virtual da QCM. De qual cidade você fala?',
  expectedAction: 'city', inboundText: 'Você é uma IA?', isFirstReply: false, maxCharacters: 900,
}), true)

const conversationalInstructions = buildLuccaInstructions({
  ...getLuccaConfig(),
  approvedQcmInfo: 'A QCM atua com marketing digital e estratégia de marketing.',
})
assert.match(conversationalInstructions, /Conduza uma conversa, não um formulário/)
assert.match(conversationalInstructions, /Responda primeiro ao que o lead disse ou perguntou/)
assert.match(conversationalInstructions, /não repita saudação/)
assert.match(conversationalInstructions, /marketing digital e estratégia de marketing/)

const empty: QualificationState = {
  city: null,
  digital_experience: null,
  team_size_text: null,
  team_size_number: null,
  business_type: null,
}
const answer = (overrides: Partial<LuccaInterpretation>): LuccaInterpretation => ({
  reply: 'Resposta',
  intendedNextAction: 'city',
  city: { answered: false, refused: false, value: null, numericValue: null },
  digitalExperience: { answered: false, refused: false, value: null, numericValue: null },
  teamSize: { answered: false, refused: false, value: null, numericValue: null },
  businessType: null,
  asksIfAi: false,
  requestsHuman: false,
  requestsStop: false,
  questionForCaio: null,
  ...overrides,
})
assert.equal(getNextQualificationAction(empty), 'city')
const withCity = mergeQualificationState(empty, answer({ city: { answered: true, refused: false, value: 'Maceió', numericValue: null } }))
assert.equal(getNextQualificationAction(withCity), 'digital_experience')
const withExperience = mergeQualificationState(withCity, answer({ digitalExperience: { answered: true, refused: false, value: 'Já contratei, sem resultado.', numericValue: null } }))
assert.equal(getNextQualificationAction(withExperience), 'team_size')
const complete = mergeQualificationState(withExperience, answer({ teamSize: { answered: true, refused: false, value: 'Eu e mais duas pessoas', numericValue: 3 } }))
assert.equal(getNextQualificationAction(complete), 'complete')
assert.equal(complete.team_size_number, 3)
const anticipated = mergeQualificationState(empty, answer({
  city: { answered: true, refused: false, value: 'Recife', numericValue: null },
  digitalExperience: { answered: true, refused: false, value: 'Nunca contratei', numericValue: null },
  teamSize: { answered: true, refused: false, value: '4 funcionários', numericValue: 4 },
  businessType: 'clínica',
}))
assert.equal(getNextQualificationAction(anticipated), 'complete')
const refusal = mergeQualificationState(empty, answer({ city: { answered: true, refused: true, value: null, numericValue: null } }))
assert.equal(getNextQualificationAction(refusal), 'digital_experience')
assert.equal(deterministicExtraction('Tudo bem, e você?').city, null)
assert.equal(deterministicExtraction('Sou de Recife.').city, 'Recife')

const parsed = parseLuccaInterpretation(JSON.stringify({
  reply: 'Entendi. Quantas pessoas tem na sua equipe da clínica hoje?',
  intended_next_action: 'team_size',
  city: { answered: false, refused: false, value: null, numeric_value: null },
  digital_experience: { answered: true, refused: false, value: 'Já contratei uma agência', numeric_value: null },
  team_size: { answered: false, refused: false, value: null, numeric_value: null },
  business_type: 'clínica',
  asks_if_ai: false,
  requests_human: false,
  requests_stop: false,
  question_for_caio: null,
}))
assert.equal(parsed.intendedNextAction, 'team_size')
assert.equal(parsed.businessType, 'clínica')

const referral = extractTwilioReferral({
  ReferralSourceId: 'ad-123',
  ReferralSourceType: 'post',
  ReferralHeadline: 'Conheça a QCM',
  ReferralMediaId: 'media-1',
  ReferralCtwaClid: 'clid-1',
})
assert.equal(referral?.source_id, 'ad-123')
assert.equal(referral?.media_id, 'media-1')
assert.equal(referral?.ctwa_clid, 'clid-1')
assert.equal(extractTwilioReferral({}), null)

const config = {
  ...getLuccaConfig(),
  enabled: true,
  workspaceId: 'workspace-qcm',
  whatsappFrom: 'whatsapp:+5582936180673',
  notificationTo: 'whatsapp:+5582996932970',
}
assert.equal(isLuccaWorkspaceEligible({ workspaceId: 'workspace-qcm', sender: 'whatsapp:+5582936180673', config }), true)
assert.equal(isLuccaWorkspaceEligible({ workspaceId: 'outro', sender: 'whatsapp:+5582936180673', config }), false)
assert.equal(isCaioNotificationNumber('whatsapp:+5582996932970', config), true)

const migration = fs.readFileSync(
  path.join(process.cwd(), 'src/supabase/migrations/20261006142427_lucca_whatsapp_qualification.sql'),
  'utf8'
)
const webhook = fs.readFileSync(path.join(process.cwd(), 'src/lib/whatsapp/twilio-webhooks.ts'), 'utf8')
const worker = fs.readFileSync(path.join(process.cwd(), 'src/lib/whatsapp/lucca/worker.ts'), 'utf8')
const inbound = fs.readFileSync(path.join(process.cwd(), 'src/lib/whatsapp/lucca/inbound.ts'), 'utf8')
const inboxActions = fs.readFileSync(
  path.join(process.cwd(), 'src/app/(dashboard)/dashboard/inbox/actions.ts'),
  'utf8'
)
const automationWorker = fs.readFileSync(path.join(process.cwd(), 'src/app/api/cron/process-automation-queue/route.ts'), 'utf8')
assert.match(migration, /UNIQUE \(workspace_id, contact_id\)/)
assert.match(migration, /lucca_jobs_event_key_unique/)
assert.match(migration, /idx_lucca_jobs_one_processing_per_type/)
assert.match(migration, /ENABLE ROW LEVEL SECURITY/g)
assert.match(migration, /TO authenticated/)
assert.match(webhook, /validateTwilioWebhookSignature/)
assert.match(webhook, /persisted\.messageId/)
assert.match(webhook, /enqueueLuccaInbound/)
assert.match(webhook, /processLuccaQueue/)
assert.match(webhook, /archived contact restore failed/)
assert.match(webhook, /\.update\(\{ deleted_at: null \}\)/)
assert.match(worker, /OpenAI indisponível; usando contingência/)
assert.match(worker, /isWithinLuccaWindow\(new Date\(\), config\)/)
assert.match(worker, /senderType: 'automation'/)
assert.match(worker, /recentConversation/)
assert.match(worker, /\.lt\('created_at', messages\[0\]\.created_at\)/)
assert.match(worker, /LUCCA_NOTIFICATION_CONTENT_SID/)
assert.match(worker, /contact\.workspace_id !== job\.workspace_id/)
assert.match(worker, /\.eq\('job_type', 'conversation'\)\.eq\('status', 'pending'\)/)
assert.match(inbound, /\.eq\('workspace_id', params\.workspaceId\)[\s\S]*\.eq\('contact_id', params\.contactId\)/)
assert.match(inbound, /max_attempts: config\.maxAttempts/)
assert.match(inbound, /recent_human_intervention/)
assert.match(inbound, /\.eq\('sender_type', 'human'\)/)
assert.doesNotMatch(inbound, /existing_conversation/)
assert.match(inboxActions, /pauseLuccaForHuman/)
assert.match(inboxActions, /resumed_by: access\.userId/)
assert.match(automationWorker, /Pausada durante qualificação do Lucca/)

console.log('OK: automação Lucca validada sem chamadas externas ou mensagens reais.')
