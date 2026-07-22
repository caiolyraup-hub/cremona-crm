/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { APP_URL } from '@/lib/stripe/config'

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
    const { workspaceId } = body ?? {}

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId e obrigatorio' }, { status: 400 })
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
        .select('stripe_customer_id')
        .eq('id', workspaceId)
        .maybeSingle() as Promise<{ data: { stripe_customer_id: string | null } | null }>,
    ])

    if (!memberResult.data) {
      return NextResponse.json({ error: 'Acesso negado ao workspace' }, { status: 403 })
    }

    if (!workspaceResult.data?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Nenhuma assinatura ativa encontrada' },
        { status: 404 }
      )
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspaceResult.data.stripe_customer_id,
      return_url: `${APP_URL}/dashboard/settings?tab=plan`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error('[stripe/portal] error', error)
    return NextResponse.json({ error: 'Erro interno ao abrir portal de cobranca' }, { status: 500 })
  }
}
