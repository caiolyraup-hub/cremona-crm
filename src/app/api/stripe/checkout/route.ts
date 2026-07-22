/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { APP_URL, TRIAL_DAYS, VALID_PRICE_IDS } from '@/lib/stripe/config'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const { priceId, workspaceId } = body ?? {}

    if (!priceId || !workspaceId) {
      return NextResponse.json({ error: 'priceId e workspaceId sao obrigatorios' }, { status: 400 })
    }

    if (!VALID_PRICE_IDS.includes(priceId)) {
      return NextResponse.json(
        { error: 'priceId invalido ou nao configurado em STRIPE_PLANS' },
        { status: 400 }
      )
    }

    const [memberResult, workspaceResult] = await Promise.all([
      (supabase as any)
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .limit(1)
        .maybeSingle() as Promise<{ data: { workspace_id: string } | null }>,
      (supabase as any)
        .from('workspaces')
        .select('id, name, business_name, stripe_customer_id')
        .eq('id', workspaceId)
        .maybeSingle() as Promise<{ data: { id: string; name: string; business_name: string | null; stripe_customer_id: string | null } | null }>,
    ])

    if (!memberResult.data) {
      return NextResponse.json({ error: 'Acesso negado ao workspace' }, { status: 403 })
    }

    const workspace = workspaceResult.data
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace nao encontrado' }, { status: 404 })
    }

    let customerId = workspace.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: workspace.business_name || workspace.name,
        metadata: {
          workspace_id: workspaceId,
          supabase_user_id: user.id,
        },
      })

      customerId = customer.id

      await (supabase as any)
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspaceId)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: { workspace_id: workspaceId },
      },
      success_url: `${APP_URL}/dashboard?checkout=success`,
      cancel_url: `${APP_URL}/dashboard/settings?tab=plan`,
      locale: 'pt-BR',
      allow_promotion_codes: true,
      metadata: { workspace_id: workspaceId },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout] error', error)
    return NextResponse.json({ error: 'Erro interno ao criar sessao de checkout' }, { status: 500 })
  }
}
