'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { BarChart3, MessageCircle, Send, TrendingUp, Users, Zap } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import type {
  WhatsAppOverview,
  MessagesByDay,
  AutomationStats,
  TopContact,
} from '@/lib/whatsapp/analytics'

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function RateBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-gray-100 ${className ?? ''}`}>
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
    </div>
  )
}

function RateBadge({ value }: { value: number }) {
  const color = value >= 70
    ? 'bg-green-100 text-green-700'
    : value >= 40
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
      {value}%
    </span>
  )
}

interface WhatsAppDashboardProps {
  initialOverview: WhatsAppOverview
  initialMessagesPerDay: MessagesByDay[]
  initialAutomationStats: AutomationStats
  initialTopContacts: TopContact[]
  workspaceId: string
}

export function WhatsAppDashboard({
  initialOverview,
  initialMessagesPerDay,
  initialAutomationStats,
  initialTopContacts,
  workspaceId,
}: WhatsAppDashboardProps) {
  const [days, setDays] = useState(30)
  const [overview, setOverview] = useState(initialOverview)
  const [messagesPerDay, setMessagesPerDay] = useState(initialMessagesPerDay)
  const [automationStats, setAutomationStats] = useState(initialAutomationStats)
  const [topContacts, setTopContacts] = useState(initialTopContacts)
  const [isPending, startTransition] = useTransition()

  function changePeriod(newDays: number) {
    setDays(newDays)
    startTransition(async () => {
      const res = await fetch(`/api/dashboard/whatsapp?workspaceId=${workspaceId}&days=${newDays}`)
      if (!res.ok) return
      const data = await res.json()
      setOverview(data.overview)
      setMessagesPerDay(data.messagesPerDay)
      setAutomationStats(data.automationStats)
      setTopContacts(data.topContacts)
    })
  }

  const isEmpty = messagesPerDay.every(d => d.sent === 0 && d.received === 0)
  const chartData = messagesPerDay.map(d => ({ ...d, label: formatDate(d.date) }))

  return (
    <div className={`space-y-6 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {/* Period selector */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => changePeriod(opt.value)}
            className={[
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              days === opt.value
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Send size={14} className="text-blue-600" />
            </div>
            <span className="text-[11px] text-gray-500">Enviadas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overview.totalSent.toLocaleString('pt-BR')}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">últimos {days} dias</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
              <MessageCircle size={14} className="text-green-600" />
            </div>
            <span className="text-[11px] text-gray-500">Recebidas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overview.totalReceived.toLocaleString('pt-BR')}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">últimos {days} dias</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <TrendingUp size={14} className="text-amber-600" />
            </div>
            <span className="text-[11px] text-gray-500">Taxa de resposta</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overview.responseRate}%</p>
          <RateBar value={overview.responseRate} className="mt-1.5" />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
              <Users size={14} className="text-purple-600" />
            </div>
            <span className="text-[11px] text-gray-500">Conversas ativas</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{overview.activeConversations.toLocaleString('pt-BR')}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">últimos 7 dias</p>
        </div>
      </div>

      {/* Messages chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-4 text-sm font-medium text-gray-900">Volume de mensagens</p>
        {isEmpty ? (
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <BarChart3 size={28} className="mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Nenhuma mensagem no período</p>
            <p className="mt-1 text-xs text-gray-400">
              Configure o WhatsApp em{' '}
              <Link href="/dashboard/settings?tab=whatsapp" className="text-blue-600 hover:underline">
                Configurações
              </Link>{' '}
              para começar.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  value,
                  name === 'sent' ? 'Enviadas' : 'Recebidas',
                ]}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="sent" fill="#1d4ed8" radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line
                type="monotone"
                dataKey="received"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom two cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Automation stats */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Performance de automações</p>
            <Zap size={14} className="text-gray-400" />
          </div>

          {automationStats.totalExecutions === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-sm text-gray-500">Nenhuma automação executada no período</p>
              <Link href="/dashboard/automations" className="mt-2 text-xs text-blue-600 hover:underline">
                Criar automação →
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <p className="text-3xl font-bold text-gray-900">
                  {automationStats.totalExecutions.toLocaleString('pt-BR')}
                </p>
                <p className="text-[11px] text-gray-400">execuções</p>
                <div className="mt-2 flex items-center gap-2">
                  <RateBar value={automationStats.successRate} className="flex-1" />
                  <span className="text-xs text-gray-500">{automationStats.successRate}% sucesso</span>
                </div>
              </div>
              <div className="space-y-2">
                {automationStats.topAutomations.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{a.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{a.executions} exec</span>
                    <RateBadge value={a.successRate} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top contacts */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Contatos mais ativos</p>
            <Users size={14} className="text-gray-400" />
          </div>

          {topContacts.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <p className="text-sm text-gray-500">Nenhuma conversa no período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topContacts.map(contact => (
                <Link
                  key={contact.contact_id}
                  href="/dashboard/inbox"
                  className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-gray-50"
                >
                  <ContactAvatar name={contact.contact_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800">{contact.contact_name}</p>
                    <p className="text-[10px] text-gray-400">
                      {contact.message_count} msg ·{' '}
                      {formatDistanceToNow(new Date(contact.last_message_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
