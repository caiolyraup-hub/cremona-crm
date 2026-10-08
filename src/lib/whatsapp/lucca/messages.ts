import { getGreeting } from './time'

export type ConfirmedTreatment = 'male' | 'female' | 'neutral'

const COMPANY_WORDS = /\b(ltda|mei|eireli|empresa|loja|studio|estudio|cl[ií]nica|clinica|barbearia|sal[aã]o|petshop|pet shop|marketing|digital|oficial)\b/i
const PHONE_LIKE = /^\+?[\d\s().-]{7,}$/
const EMOJI_TEST_PATTERN = /\p{Extended_Pictographic}|\uFE0F|\u20E3/u
const EMOJI_REPLACE_PATTERN = /\p{Extended_Pictographic}|\uFE0F|\u20E3/gu

export function sanitizeFirstName(value: string | null | undefined): string | null {
  const normalized = (value ?? '').replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length > 80 || /^whatsapp:/i.test(normalized) || PHONE_LIKE.test(normalized)) return null
  if (COMPANY_WORDS.test(normalized) || /[@/\\]|https?:/i.test(normalized)) return null

  const first = normalized.split(' ')[0]?.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '') ?? ''
  if (first.length < 2 || first.length > 30 || !/^\p{L}[\p{L}'’-]*$/u.test(first)) return null

  return first.charAt(0).toLocaleUpperCase('pt-BR') + first.slice(1).toLocaleLowerCase('pt-BR')
}

export function resolveConfirmedTreatment(customFields: unknown): ConfirmedTreatment {
  if (!customFields || typeof customFields !== 'object') return 'neutral'
  const fields = customFields as Record<string, unknown>
  const raw = String(fields.gender ?? fields.genero ?? fields.sexo ?? '').trim().toLowerCase()
  if (['female', 'feminino', 'mulher', 'f'].includes(raw)) return 'female'
  if (['male', 'masculino', 'homem', 'm'].includes(raw)) return 'male'
  return 'neutral'
}

function welcomeFor(treatment: ConfirmedTreatment) {
  if (treatment === 'female') return 'Seja muito bem-vinda à QCM!'
  if (treatment === 'male') return 'Seja muito bem-vindo à QCM!'
  return 'Que bom receber você na QCM!'
}

function cityQuestionFor(treatment: ConfirmedTreatment) {
  if (treatment === 'female') return 'De qual cidade você fala, minha amiga?'
  if (treatment === 'male') return 'De qual cidade você fala, meu amigo?'
  return 'De qual cidade você fala?'
}

const QUALIFICATION_REASON = 'Vou fazer algumas perguntas para entender o momento atual da sua empresa e pensar no melhor plano de escala de vendas para o seu negócio.'

export function buildReception(params: {
  date: Date
  timeZone: string
  firstName?: string | null
  treatment?: ConfirmedTreatment
}) {
  const greeting = getGreeting(params.date, params.timeZone)
  const name = sanitizeFirstName(params.firstName)
  const treatment = params.treatment ?? 'neutral'
  const addressedGreeting = name ? `${greeting}, ${name}!` : `${greeting}!`
  const introduction = treatment === 'neutral' ? 'Aqui é o Lucca.' : 'Aqui é o Lucca, da QCM.'
  return `${addressedGreeting} Tudo bem por aí? ${welcomeFor(treatment)} ${introduction} ${QUALIFICATION_REASON} ${cityQuestionFor(treatment)}`
}

export function buildInitialFallbackReply(params: {
  date: Date
  timeZone: string
  firstName?: string | null
  treatment?: ConfirmedTreatment
  nextAction: 'city' | 'digital_experience' | 'team_size' | 'complete' | 'handoff' | 'stop' | 'clarify'
  businessType?: string | null
}) {
  if (params.nextAction === 'city') return buildReception(params)
  const greeting = getGreeting(params.date, params.timeZone)
  const name = sanitizeFirstName(params.firstName)
  const treatment = params.treatment ?? 'neutral'
  const addressedGreeting = name ? `${greeting}, ${name}!` : `${greeting}!`
  const introduction = treatment === 'neutral' ? 'Aqui é o Lucca.' : 'Aqui é o Lucca, da QCM.'
  const next = buildFallbackReply({
    nextField: params.nextAction,
    firstName: name,
    businessType: params.businessType,
  })
  return `${addressedGreeting} Tudo bem por aí? ${welcomeFor(treatment)} ${introduction} ${QUALIFICATION_REASON} ${next}`
}

export function buildFallbackReply(params: {
  nextField: 'city' | 'digital_experience' | 'team_size' | 'complete' | 'handoff' | 'stop' | 'clarify'
  firstName?: string | null
  businessType?: string | null
}) {
  const name = sanitizeFirstName(params.firstName)
  const addressed = name ? `, ${name}` : ''

  switch (params.nextField) {
    case 'city':
      return `Obrigado por responder${addressed}. De qual cidade você fala?`
    case 'digital_experience':
      return `Que bom${addressed}! Já teve alguma experiência contratando uma empresa para cuidar do seu digital?`
    case 'team_size': {
      const establishment = sanitizeBusinessType(params.businessType)
      return `Entendi${addressed}. Obrigado por me contar. Quantas pessoas tem na sua equipe ${establishment ? `d${articleFor(establishment)} ${establishment}` : 'da loja'} hoje?`
    }
    case 'complete':
      return `Perfeito${addressed}! Obrigado por me contar. Já deixei tudo organizado para o Caio continuar seu atendimento com esse contexto.`
    case 'handoff':
      return `Claro${addressed}. Vou deixar a conversa com o Caio para ele continuar seu atendimento.`
    case 'stop':
      return `Tudo bem${addressed}. Não vou enviar outras mensagens automáticas por aqui.`
    case 'clarify':
      return `Não consegui entender essa informação${addressed}. Pode me explicar de outra forma, por favor?`
  }
}

function sanitizeBusinessType(value: string | null | undefined) {
  const normalized = (value ?? '').trim().toLowerCase()
  const allowed = ['clínica', 'clinica', 'escritório', 'escritorio', 'salão', 'salao', 'barbearia', 'pet shop', 'petshop', 'empresa', 'loja']
  return allowed.includes(normalized) ? normalized : null
}

function articleFor(value: string) {
  return ['clínica', 'clinica', 'empresa', 'loja', 'barbearia'].includes(value) ? 'a' : 'o'
}

export function containsEmoji(value: string) {
  return EMOJI_TEST_PATTERN.test(value)
}

export function stripEmojis(value: string) {
  return value.replace(EMOJI_REPLACE_PATTERN, '').replace(/\s{2,}/g, ' ').trim()
}

export function isDirectAiQuestion(value: string) {
  return /\b(voc[eê]\s+(é|e)\s+(uma?\s+)?(ia|intelig[eê]ncia artificial|rob[oô]|bot|assistente virtual)|isso\s+(é|e)\s+(uma?\s+)?(ia|rob[oô]|bot))\b/i.test(value)
}

export function asksForHuman(value: string) {
  return /\b(falar|conversar|atendimento|atendente)\b.{0,30}\b(humano|atendente|pessoa|caio|algu[eé]m)\b|\bquero\s+(o\s+)?caio\b/i.test(value)
}

export function asksToStop(value: string) {
  return /\b(pare|parar|n[aã]o\s+(me\s+)?mande|n[aã]o\s+(me\s+)?envie|remova|sair|descadastrar|cancelar mensagens)\b/i.test(value)
}
