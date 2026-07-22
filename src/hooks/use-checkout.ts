'use client'

import { useState } from 'react'
import { STRIPE_PLANS, type PlanKey } from '@/lib/stripe/config'

async function fetchRedirectUrl(
  endpoint: string,
  body: Record<string, string>,
  fallbackError: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({ error: 'Resposta invalida do servidor' }))
    if (!response.ok || !data.url) return { url: null, error: data.error ?? fallbackError }
    return { url: data.url, error: null }
  } catch {
    return { url: null, error: 'Erro de conexao. Tente novamente.' }
  }
}

export function useCheckout(workspaceId: string) {
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startCheckout(planKey: PlanKey): Promise<void> {
    setError(null)
    const plan = STRIPE_PLANS[planKey]

    if (!plan.priceId) {
      setError(
        `Price ID do plano "${plan.name}" nao configurado. Configure STRIPE_PRICE_${planKey.toUpperCase()} e adicione o Price ID do Stripe Dashboard.`
      )
      return
    }

    setIsCheckoutLoading(true)
    const { url, error: fetchError } = await fetchRedirectUrl(
      '/api/stripe/checkout',
      { priceId: plan.priceId, workspaceId },
      'Erro ao iniciar checkout'
    )
    setIsCheckoutLoading(false)

    if (fetchError) { setError(fetchError); return }
    window.location.href = url!
  }

  async function openPortal(): Promise<void> {
    setError(null)
    setIsPortalLoading(true)
    const { url, error: fetchError } = await fetchRedirectUrl(
      '/api/stripe/portal',
      { workspaceId },
      'Erro ao abrir portal de cobranca'
    )
    setIsPortalLoading(false)

    if (fetchError) { setError(fetchError); return }
    window.location.href = url!
  }

  return { isCheckoutLoading, isPortalLoading, error, startCheckout, openPortal }
}
