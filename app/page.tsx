import { DashboardClient, type AppointmentView, type SubscriberView } from './dashboard-client'
import { getWorkspaceId, createClient } from '../lib/supabase/server'
import { listAppointments } from '../lib/subscriptions/actions/appointments'
import { listBarbers } from '../lib/subscriptions/actions/barbers'
import { listPlans } from '../lib/subscriptions/actions/plans'
import type {
  AppointmentGoogleSyncLog,
  Barber,
  Plan,
  Subscriber,
  Subscription,
} from '../types/subscriptions'

type PageProps = {
  searchParams?: {
    ok?: string
    error?: string
  }
}

function saoPauloToday() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const label = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date())

  return {
    label,
    startsAt: `${date}T00:00:00-03:00`,
    endsAt: `${date}T23:59:59-03:00`,
  }
}

async function getSubscribers(workspaceId: string, plans: Plan[]): Promise<SubscriberView[]> {
  const supabase = createClient()
  const [{ data: subscribers }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('subscribers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('current_period_end', { ascending: false }),
  ])

  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const subscriptionBySubscriber = new Map<string, Subscription>()

  for (const subscription of (subscriptions ?? []) as Subscription[]) {
    if (!subscriptionBySubscriber.has(subscription.subscriber_id)) {
      subscriptionBySubscriber.set(subscription.subscriber_id, subscription)
    }
  }

  return ((subscribers ?? []) as Subscriber[]).map((subscriber) => {
    const subscription = subscriptionBySubscriber.get(subscriber.id)
    const plan = subscription ? planById.get(subscription.plan_id) : null
    const limit = plan?.usage_limit ?? null
    const used = subscription?.usage_count_current_period ?? 0
    const usagePercent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

    return {
      id: subscriber.id,
      contact_id: subscriber.contact_id,
      status: subscriber.status,
      plan_name: plan?.name ?? 'Sem plano ativo',
      usage_label: limit ? `${used}/${limit}` : 'Ilimitado',
      usage_percent: limit ? usagePercent : 100,
    }
  })
}

async function getSyncLogs(workspaceId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('appointment_google_sync_logs')
    .select('id, operation, error_message, retry_count, next_retry_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []) as Pick<
    AppointmentGoogleSyncLog,
    'id' | 'operation' | 'error_message' | 'retry_count' | 'next_retry_at'
  >[]
}

function enrichAppointments(
  appointments: Awaited<ReturnType<typeof listAppointments>>['data'],
  barbers: Barber[],
  subscribers: SubscriberView[],
): AppointmentView[] {
  const barberById = new Map(barbers.map((barber) => [barber.id, barber.name]))
  const subscriberById = new Map(subscribers.map((subscriber) => [subscriber.id, subscriber]))

  return (appointments ?? []).map((appointment) => {
    const subscriber = appointment.subscriber_id ? subscriberById.get(appointment.subscriber_id) : null

    return {
      ...appointment,
      barber_name: barberById.get(appointment.barber_id) ?? 'Barbeiro',
      usage_label: subscriber?.usage_label ?? 'Avulso sem quota',
    }
  })
}

export default async function Page({ searchParams }: PageProps) {
  const workspaceId = await getWorkspaceId()

  if (!workspaceId) {
    return (
      <main className="workspace standalone">
        <section className="detail-panel glass">
          <p className="eyebrow">Setup pendente</p>
          <h1>Workspace nao encontrado</h1>
          <p className="muted-copy">
            Entre com um usuario associado a workspace_members para carregar agenda, planos e barbeiros.
          </p>
        </section>
      </main>
    )
  }

  const today = saoPauloToday()
  const [appointmentsResult, barbersResult, plansResult] = await Promise.all([
    listAppointments(workspaceId, {
      starts_at_from: today.startsAt,
      starts_at_to: today.endsAt,
    }),
    listBarbers(workspaceId),
    listPlans(workspaceId),
  ])

  const barbers = barbersResult.data ?? []
  const plans = plansResult.data ?? []
  const [subscribers, syncLogs] = await Promise.all([
    getSubscribers(workspaceId, plans),
    getSyncLogs(workspaceId),
  ])

  return (
    <DashboardClient
      appointments={enrichAppointments(appointmentsResult.data, barbers, subscribers)}
      barbers={barbers}
      error={searchParams?.error ? decodeURIComponent(searchParams.error) : appointmentsResult.error ?? barbersResult.error ?? plansResult.error ?? undefined}
      notice={searchParams?.ok ? decodeURIComponent(searchParams.ok) : undefined}
      plans={plans}
      subscribers={subscribers}
      syncLogs={syncLogs}
      todayLabel={today.label}
    />
  )
}
