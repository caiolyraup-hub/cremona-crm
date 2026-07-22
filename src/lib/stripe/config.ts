export const TRIAL_DAYS = 14

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ?? 'http://localhost:3000'

export type PlanKey = 'starter' | 'professional'

export interface StripePlan {
  name: string
  priceId: string
  amount: number
  currency: string
  interval: 'month'
  features: string[]
}

export const STRIPE_PLANS: Record<PlanKey, StripePlan> = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_PRICE_STARTER ?? '',
    amount: 9700,
    currency: 'brl',
    interval: 'month',
    features: [
      '1 numero WhatsApp',
      'Ate 500 contatos',
      'CRM + funil + etiquetas',
      'Tarefas e lembretes',
      'Suporte por WhatsApp',
    ],
  },
  professional: {
    name: 'Profissional',
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL ?? '',
    amount: 14700,
    currency: 'brl',
    interval: 'month',
    features: [
      '1 numero WhatsApp',
      'Contatos ilimitados',
      'Dashboard semanal',
      'Relatorio IA',
      'Templates de follow-up',
      'Suporte por WhatsApp',
    ],
  },
}

export const VALID_PRICE_IDS: string[] = Object.values(STRIPE_PLANS)
  .map((p) => p.priceId)
  .filter(Boolean)

export function getPlanNameByPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null
  for (const [, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.priceId && plan.priceId === priceId) return plan.name
  }
  return null
}
