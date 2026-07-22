'use client'

import type { ReactNode } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Star, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { STRIPE_PLANS, getPlanNameByPriceId } from '@/lib/stripe/config'
import { useCheckout } from '@/hooks/use-checkout'

interface PlanSettingsProps {
  workspace: {
    id: string
    plan: string
    trial_ends_at: string | null
    created_at: string
    subscription_status: string | null
    stripe_price_id: string | null
    stripe_customer_id: string | null
    subscription_ends_at: string | null
  }
}

type StatusKind = 'trial_active' | 'trial_expired' | 'active' | 'past_due' | 'canceled'

function resolveStatus(workspace: PlanSettingsProps['workspace']): {
  status: StatusKind
  daysLeft: number
  trialProgress: number
} {
  const now = new Date()
  const subStatus = workspace.subscription_status

  if (subStatus === 'active') return { status: 'active', daysLeft: 0, trialProgress: 100 }
  if (subStatus === 'past_due') return { status: 'past_due', daysLeft: 0, trialProgress: 100 }
  if (subStatus === 'canceled') return { status: 'canceled', daysLeft: 0, trialProgress: 100 }

  const trialEnd = workspace.trial_ends_at ? new Date(workspace.trial_ends_at) : null
  if (trialEnd && trialEnd <= now) {
    return { status: 'trial_expired', daysLeft: 0, trialProgress: 100 }
  }

  const totalTrialDays = 14
  const elapsed = Math.max(0, differenceInCalendarDays(now, new Date(workspace.created_at)))
  const daysLeft = trialEnd
    ? Math.max(0, differenceInCalendarDays(trialEnd, now))
    : Math.max(0, totalTrialDays - elapsed)
  const trialProgress = Math.min(100, Math.max(0, (elapsed / totalTrialDays) * 100))

  return { status: 'trial_active', daysLeft, trialProgress }
}

function PlanCardHeader({
  title,
  badge,
}: {
  title: string
  badge: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Plano atual</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900">{title}</p>
      </div>
      {badge}
    </div>
  )
}

function UpgradeCards({ workspaceId, urgent = false }: { workspaceId: string; urgent?: boolean }) {
  const { isCheckoutLoading, error, startCheckout } = useCheckout(workspaceId)

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Starter */}
        <div className="flex flex-col rounded-xl border border-gray-200 p-4">
          <p className="mb-0.5 text-sm font-semibold text-gray-900">{STRIPE_PLANS.starter.name}</p>
          <p className="mb-3 text-lg font-bold text-gray-900">
            {formatCurrency(STRIPE_PLANS.starter.amount / 100)}
            <span className="ml-1 text-xs font-normal text-gray-400">/mês</span>
          </p>
          <ul className="mb-4 flex-1 space-y-1.5">
            {STRIPE_PLANS.starter.features.map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircle2 size={12} className="shrink-0 text-green-500" />
                {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={isCheckoutLoading}
            onClick={() => void startCheckout('starter')}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {isCheckoutLoading ? <Loader2 size={12} className="animate-spin" /> : null}
            Assinar por {formatCurrency(STRIPE_PLANS.starter.amount / 100)}/mês
          </button>
        </div>

        {/* Professional */}
        <div
          className={[
            'flex flex-col rounded-xl border-2 p-4',
            urgent ? 'border-red-400' : 'border-blue-500',
          ].join(' ')}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{STRIPE_PLANS.professional.name}</p>
            <span className="flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              <Star size={9} />
              Mais popular
            </span>
          </div>
          <p className="mb-3 text-lg font-bold text-gray-900">
            {formatCurrency(STRIPE_PLANS.professional.amount / 100)}
            <span className="ml-1 text-xs font-normal text-gray-400">/mês</span>
          </p>
          <ul className="mb-4 flex-1 space-y-1.5">
            {STRIPE_PLANS.professional.features.map((f) => (
              <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                <CheckCircle2 size={12} className="shrink-0 text-blue-500" />
                {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={isCheckoutLoading}
            onClick={() => void startCheckout('professional')}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {isCheckoutLoading ? <Loader2 size={12} className="animate-spin" /> : null}
            Assinar por {formatCurrency(STRIPE_PLANS.professional.amount / 100)}/mês
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlanSettings({ workspace }: PlanSettingsProps) {
  const { status, daysLeft, trialProgress } = resolveStatus(workspace)
  const { isPortalLoading, error, openPortal } = useCheckout(workspace.id)
  const activePlanName = getPlanNameByPriceId(workspace.stripe_price_id)
  const trialEnd = workspace.trial_ends_at ? new Date(workspace.trial_ends_at) : null

  return (
    <div className="max-w-lg space-y-5">

      {/* ── Trial ativo ── */}
      {status === 'trial_active' ? (
        <div className="rounded-xl border border-gray-200 p-5">
          <PlanCardHeader
            title="Trial gratuito"
            badge={
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Trial ativo
              </span>
            }
          />
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-3">
            <p className="text-sm text-amber-700">
              {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
              {trialEnd ? (
                <span className="ml-1 text-amber-500">
                  (vence em {format(trialEnd, "d 'de' MMMM", { locale: ptBR })})
                </span>
              ) : null}
            </p>
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-amber-600">
                <span>Dia 1</span>
                <span>Dia 14</span>
              </div>
            </div>
          </div>

          {daysLeft <= 3 ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-xs text-red-700">
                <AlertTriangle size={12} className="mr-1 inline-block" />
                Seu trial termina em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}.
                Assine agora para nao perder o acesso.
              </p>
            </div>
          ) : null}

          <p className="mb-3 text-sm font-medium text-gray-700">Escolha seu plano:</p>
          <UpgradeCards workspaceId={workspace.id} />
        </div>
      ) : null}

      {/* ── Trial expirado ── */}
      {status === 'trial_expired' ? (
        <div className="rounded-xl border border-red-200 p-5">
          <PlanCardHeader
            title="Trial expirado"
            badge={
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                Trial expirado
              </span>
            }
          />
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs text-red-700">
              <AlertTriangle size={12} className="mr-1 inline-block" />
              Seu trial encerrou. Assine para continuar usando o Cremona.
            </p>
          </div>
          <UpgradeCards workspaceId={workspace.id} urgent />
        </div>
      ) : null}

      {/* ── Assinatura ativa ── */}
      {status === 'active' ? (
        <div className="rounded-xl border border-gray-200 p-5">
          <PlanCardHeader
            title={activePlanName ?? 'Plano ativo'}
            badge={
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Ativo
                </span>
                <Zap size={18} className="text-blue-500" />
              </div>
            }
          />
          {workspace.subscription_ends_at ? (
            <p className="mb-4 text-sm text-gray-500">
              Proxima cobranca:{' '}
              <span className="font-medium text-gray-700">
                {format(new Date(workspace.subscription_ends_at), "d 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </span>
            </p>
          ) : null}
          {error ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            disabled={isPortalLoading}
            onClick={() => void openPortal()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {isPortalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            Gerenciar assinatura
          </button>
        </div>
      ) : null}

      {/* ── Pagamento pendente ── */}
      {status === 'past_due' ? (
        <div className="rounded-xl border border-red-200 p-5">
          <PlanCardHeader
            title={activePlanName ?? 'Plano'}
            badge={
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                Pagamento pendente
              </span>
            }
          />
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
            <p className="text-xs text-red-700">
              <AlertTriangle size={12} className="mr-1 inline-block" />
              Houve um problema com seu pagamento. Resolva para manter o acesso.
            </p>
          </div>
          {error ? (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              {error}
            </div>
          ) : null}
          <button
            type="button"
            disabled={isPortalLoading}
            onClick={() => void openPortal()}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {isPortalLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            Resolver pagamento
          </button>
        </div>
      ) : null}

      {/* ── Cancelado ── */}
      {status === 'canceled' ? (
        <div className="rounded-xl border border-gray-200 p-5">
          <PlanCardHeader
            title="Cancelado"
            badge={
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                Cancelado
              </span>
            }
          />
          <p className="mb-4 text-sm text-gray-500">
            Sua assinatura foi encerrada. Reative para voltar a usar o Cremona.
          </p>
          <UpgradeCards workspaceId={workspace.id} />
        </div>
      ) : null}
    </div>
  )
}
