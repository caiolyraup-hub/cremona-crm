export type QualificationField = 'city' | 'digital_experience' | 'team_size'
export type LuccaNextAction = QualificationField | 'complete' | 'handoff' | 'stop' | 'clarify'

export type ExtractedAnswer = {
  answered: boolean
  refused: boolean
  value: string | null
  numericValue: number | null
}

export type LuccaInterpretation = {
  reply: string
  intendedNextAction: LuccaNextAction
  city: ExtractedAnswer
  digitalExperience: ExtractedAnswer
  teamSize: ExtractedAnswer
  businessType: string | null
  asksIfAi: boolean
  requestsHuman: boolean
  requestsStop: boolean
  questionForCaio: string | null
}

export type QualificationState = {
  city: string | null
  digital_experience: string | null
  team_size_text: string | null
  team_size_number: number | null
  business_type: string | null
}

function acceptedValue(answer: ExtractedAnswer): string | null {
  if (!answer.answered) return null
  if (answer.refused) return 'Preferiu não responder'
  const value = answer.value?.trim().slice(0, 500) ?? ''
  return value || null
}

export function mergeQualificationState(
  current: QualificationState,
  interpretation: LuccaInterpretation
): QualificationState {
  return {
    city: current.city ?? acceptedValue(interpretation.city),
    digital_experience:
      current.digital_experience ?? acceptedValue(interpretation.digitalExperience),
    team_size_text: current.team_size_text ?? acceptedValue(interpretation.teamSize),
    team_size_number:
      current.team_size_number ??
      (interpretation.teamSize.answered && !interpretation.teamSize.refused
        ? interpretation.teamSize.numericValue
        : null),
    business_type: current.business_type ?? interpretation.businessType?.trim().slice(0, 80) ?? null,
  }
}

export function getNextQualificationAction(state: QualificationState): LuccaNextAction {
  if (!state.city) return 'city'
  if (!state.digital_experience) return 'digital_experience'
  if (!state.team_size_text) return 'team_size'
  return 'complete'
}

export function getStepForAction(action: LuccaNextAction): number {
  if (action === 'city') return 1
  if (action === 'digital_experience') return 2
  if (action === 'team_size') return 3
  return 4
}

export function buildQualificationSummary(state: QualificationState) {
  return [
    `Cidade: ${state.city ?? 'não informada'}`,
    `Experiência anterior com empresa de digital: ${state.digital_experience ?? 'não informada'}`,
    `Equipe: ${state.team_size_text ?? 'não informada'}`,
  ].join('\n')
}

export function deterministicExtraction(text: string): Partial<QualificationState> {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const cityMatch = normalized.match(/\b(?:sou|falo|venho)\s+d[aeo]\s+([\p{L}][\p{L}\s'-]{1,50})/iu)
    ?? normalized.match(/\bmoro\s+em\s+([\p{L}][\p{L}\s'-]{1,50})/iu)
  const city = cityMatch?.[1]?.split(/[,.!?]/)[0]?.trim() ?? null

  const teamMatch = normalized.match(/\b(?:somos|equipe\s+(?:de|com)|tenho)\s+(\d{1,3})\b/i)
  const teamSizeNumber = teamMatch ? Number(teamMatch[1]) : null

  return {
    city: city && city.length <= 60 ? city : null,
    team_size_text: teamMatch ? normalized.slice(0, 500) : null,
    team_size_number: teamSizeNumber,
  }
}
