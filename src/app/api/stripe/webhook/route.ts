/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

function mapSubscriptionStatus(stripeStatus: string): string {
  if (stripeStatus === 'trialing') return 'trial'
  if (stripeStatus === 'active') return 'active'
  if (stripeStatus === 'past_due') return 'past_due'
  if (stripeStatus === 'canceled') return 'canceled'
  if (stripeStatus === 'unpaid') return 'unpaid'
  return 'trial'
}

function getInvoiceCustomerId(invoice: Stripe.Invoice): string | undefined {
  return typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? undefined
}

async function handleSubscriptionUpserted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const workspaceId = subscription.metadata?.workspace_id

  if (!workspaceId) {
    console.warn('[stripe/webhook] subscription sem workspace_id no metadata', {
      subscription_id: subscription.id,
    })
    return
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null
  // current_period_end is present at runtime but may not be typed in all Stripe SDK versions
  const rawPeriodEnd = (subscription as any).current_period_end as number | undefined
  const periodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000).toISOString() : null

  await (supabase as any)
    .from('workspaces')
    .update({
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      subscription_status: mapSubscriptionStatus(subscription.status as string),
      subscription_ends_at: periodEnd,
    })
    .eq('id', workspaceId)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const workspaceId = subscription.metadata?.workspace_id

  if (!workspaceId) return

  await (supabase as any)
    .from('workspaces')
    .update({
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
    })
    .eq('id', workspaceId)
}

async function handleInvoiceStatus(invoice: Stripe.Invoice, status: 'active' | 'past_due') {
  const supabase = createAdminClient()
  const customerId = getInvoiceCustomerId(invoice)

  if (!customerId) return

  await (supabase as any)
    .from('workspaces')
    .update({ subscription_status: status })
    .eq('stripe_customer_id', customerId)

  if (status === 'active') {
    console.info('[stripe/webhook] invoice pago com sucesso', {
      invoice_id: invoice.id,
      customer_id: customerId,
    })
  } else {
    console.warn('[stripe/webhook] pagamento de invoice falhou', {
      invoice_id: invoice.id,
      customer_id: customerId,
    })
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET nao configurado')
    return NextResponse.json({ error: 'Webhook secret nao configurado' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[stripe/webhook] assinatura invalida', { message })
    return NextResponse.json({ error: `Assinatura invalida: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handleInvoiceStatus(event.data.object as Stripe.Invoice, 'active')
        break
      case 'invoice.payment_failed':
        await handleInvoiceStatus(event.data.object as Stripe.Invoice, 'past_due')
        break
      default:
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] erro ao processar evento', { event_type: event.type, err })
    return NextResponse.json({ received: true, error: 'Erro interno ao processar evento' })
  }

  return NextResponse.json({ received: true })
}
