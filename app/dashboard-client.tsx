'use client'

import { Fragment, useMemo, useState, type CSSProperties } from 'react'
import {
  cancelAppointmentFromForm,
  completeAppointmentFromForm,
  createAppointmentFromForm,
  rescheduleAppointmentFromForm,
  retryGoogleSyncFromForm,
} from './actions'
import type {
  AppointmentStatus,
  Barber,
  Plan,
  SubscriberStatus,
} from '../types/subscriptions'

export type AppointmentView = {
  id: string
  barber_id: string
  barber_name: string
  contact_id: string
  subscriber_id: string | null
  customer_kind: 'subscriber' | 'walk_in'
  service: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  source: string
  google_event_id: string | null
  usage_label: string
}

export type SubscriberView = {
  id: string
  contact_id: string
  status: SubscriberStatus
  plan_name: string
  usage_label: string
  usage_percent: number
}

type SyncLogView = {
  id: string
  operation: string
  error_message: string | null
  retry_count: number
  next_retry_at: string | null
}

type Props = {
  todayLabel: string
  notice?: string
  error?: string
  appointments: AppointmentView[]
  subscribers: SubscriberView[]
  barbers: Barber[]
  plans: Plan[]
  syncLogs: SyncLogView[]
}

const tabs = [
  ['agenda', 'A', 'Agenda'],
  ['assinantes', 'S', 'Assinantes'],
  ['barbeiros', 'B', 'Barbeiros'],
  ['planos', 'P', 'Planos'],
  ['sync', 'G', 'Sync Google'],
] as const

function time(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function dateInputValue(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function currency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function badgeForAppointment(appointment: AppointmentView) {
  if (appointment.status === 'canceled' || appointment.status === 'no_show') {
    return { label: appointment.status, className: 'blocked' }
  }

  if (!appointment.google_event_id) return { label: 'Sync pendente', className: 'pending' }
  if (appointment.customer_kind === 'subscriber') return { label: 'Assinante', className: 'subscriber' }
  return { label: 'Avulso', className: 'walkin' }
}

function appointmentTone(appointment: AppointmentView) {
  if (appointment.status === 'canceled' || appointment.status === 'no_show') return 'red'
  if (!appointment.google_event_id) return 'sync'
  if (appointment.customer_kind === 'subscriber') return 'gold'
  return 'blue'
}

export function DashboardClient({
  todayLabel,
  notice,
  error,
  appointments,
  subscribers,
  barbers,
  plans,
  syncLogs,
}: Props) {
  const [view, setView] = useState<(typeof tabs)[number][0]>('agenda')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(appointments[0]?.id ?? '')

  const selected = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedId) ?? appointments[0],
    [appointments, selectedId],
  )

  const completedCount = appointments.filter((appointment) => appointment.status === 'completed').length
  const subscriberCount = appointments.filter((appointment) => appointment.customer_kind === 'subscriber').length
  const walkInCount = appointments.length - subscriberCount
  const blockedCount = subscribers.filter((subscriber) => subscriber.status !== 'active').length
  const pendingSyncCount = syncLogs.length + appointments.filter((appointment) => !appointment.google_event_id).length

  return (
    <>
      <div className="shell">
        <aside className="sidebar glass">
          <div className="brand">
            <div className="brand-mark">C</div>
            <div>
              <strong>Costta</strong>
              <span>Sistema</span>
            </div>
          </div>

          <nav className="nav" aria-label="Navegacao principal">
            {tabs.map(([key, icon, label]) => (
              <button
                className={`nav-item ${view === key ? 'active' : ''}`}
                key={key}
                onClick={() => setView(key)}
                type="button"
              >
                <span className="nav-icon">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <span className="status-dot" />
            Google Calendar em modo saida
          </div>
        </aside>

        <main className="workspace">
          <header className="topbar glass">
            <div>
              <p className="eyebrow">Barbearia Costta</p>
              <h1>Agenda operacional</h1>
            </div>
            <div className="top-actions">
              <form action={retryGoogleSyncFromForm}>
                <button className="icon-button" title="Reprocessar sync Google" type="submit">
                  G
                </button>
              </form>
              <button className="icon-button danger" title="Alertas de cobranca" type="button">
                !
              </button>
              <button className="primary-button" onClick={() => setDrawerOpen(true)} type="button">
                Novo agendamento
              </button>
            </div>
          </header>

          {(notice || error) && (
            <div className={`notice glass ${error ? 'notice-error' : ''}`}>
              <span className="status-dot" />
              {error ?? notice}
            </div>
          )}

          <section className={`view ${view === 'agenda' ? 'active' : ''}`}>
            <div className="metrics">
              <article className="metric glass">
                <span>Atendimentos hoje</span>
                <strong>{appointments.length}</strong>
                <small>
                  {subscriberCount} assinantes, {walkInCount} avulsos
                </small>
              </article>
              <article className="metric glass">
                <span>Check-ins feitos</span>
                <strong>{completedCount}</strong>
                <small>quota atualizada no periodo</small>
              </article>
              <article className="metric glass">
                <span>Bloqueios ativos</span>
                <strong>{blockedCount}</strong>
                <small>past_due, paused ou canceled</small>
              </article>
              <article className="metric glass">
                <span>Sync pendente</span>
                <strong>{pendingSyncCount}</strong>
                <small>Google nao bloqueia a agenda</small>
              </article>
            </div>

            <div className="agenda-layout">
              <section className="agenda-board glass">
                <div className="board-toolbar">
                  <div>
                    <p className="eyebrow">{todayLabel}</p>
                    <h2>Fila do dia</h2>
                  </div>
                  <div className="toolbar-controls">
                    <div className="segmented" role="tablist" aria-label="Modo da agenda">
                      <button className="selected" type="button">
                        Dia
                      </button>
                      <button type="button">Semana</button>
                      <button type="button">Mes</button>
                    </div>
                  </div>
                </div>

                {appointments.length === 0 ? (
                  <div className="empty-state">
                    <strong>Nenhum agendamento para hoje.</strong>
                    <span>Use o botao Novo agendamento para gravar em appointments.</span>
                  </div>
                ) : (
                  <div className="timeline">
                    {appointments.map((appointment) => {
                      const badge = badgeForAppointment(appointment)
                      return (
                        <Fragment key={appointment.id}>
                          <div className="time">{time(appointment.starts_at)}</div>
                          <button
                            className={`appointment ${appointmentTone(appointment)} ${
                              selected?.id === appointment.id ? 'selected' : ''
                            }`}
                            onClick={() => setSelectedId(appointment.id)}
                            type="button"
                          >
                            <span className={`badge ${badge.className}`}>{badge.label}</span>
                            <strong>{appointment.service}</strong>
                            <small>
                              {appointment.barber_name} · {time(appointment.starts_at)}-{time(appointment.ends_at)}
                            </small>
                          </button>
                        </Fragment>
                      )
                    })}
                  </div>
                )}
              </section>

              <aside className="detail-panel glass">
                {selected ? (
                  <>
                    <div className="panel-heading">
                      <p className="eyebrow">Agendamento selecionado</p>
                      <h2>{selected.service}</h2>
                    </div>
                    <div className="identity-row">
                      <div>
                        <span className={`badge ${selected.customer_kind === 'subscriber' ? 'subscriber' : 'walkin'}`}>
                          {selected.customer_kind === 'subscriber' ? 'Assinante' : 'Avulso'}
                        </span>
                        <strong>{selected.customer_kind === 'subscriber' ? 'Cliente assinante' : 'Cliente avulso'}</strong>
                        <small>{selected.usage_label}</small>
                      </div>
                      <div className="quota-ring">{selected.customer_kind === 'subscriber' ? 'Quota' : 'Livre'}</div>
                    </div>

                    <dl className="facts">
                      <div>
                        <dt>Barbeiro</dt>
                        <dd>{selected.barber_name}</dd>
                      </div>
                      <div>
                        <dt>Horario</dt>
                        <dd>
                          {time(selected.starts_at)}-{time(selected.ends_at)}
                        </dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{selected.status}</dd>
                      </div>
                      <div>
                        <dt>Google</dt>
                        <dd>{selected.google_event_id ? 'sincronizado' : 'pendente'}</dd>
                      </div>
                    </dl>

                    <div className="action-stack">
                      <form action={completeAppointmentFromForm}>
                        <input name="appointment_id" type="hidden" value={selected.id} />
                        <button className="primary-button" type="submit">
                          Marcar completed
                        </button>
                      </form>
                      <details className="edit-box">
                        <summary>Editar horario</summary>
                        <form action={rescheduleAppointmentFromForm}>
                          <input name="appointment_id" type="hidden" value={selected.id} />
                          <label>
                            Servico
                            <input name="service" defaultValue={selected.service} />
                          </label>
                          <label>
                            Barbeiro
                            <select name="barber_id" defaultValue={selected.barber_id}>
                              {barbers.map((barber) => (
                                <option key={barber.id} value={barber.id}>
                                  {barber.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="form-grid">
                            <label>
                              Data
                              <input name="date" type="date" defaultValue={dateInputValue(selected.starts_at)} />
                            </label>
                            <label>
                              Inicio
                              <input name="starts_at_time" type="time" defaultValue={time(selected.starts_at)} />
                            </label>
                          </div>
                          <label>
                            Fim
                            <input name="ends_at_time" type="time" defaultValue={time(selected.ends_at)} />
                          </label>
                          <button className="secondary-button" type="submit">
                            Salvar edicao
                          </button>
                        </form>
                      </details>
                      <form action={cancelAppointmentFromForm}>
                        <input name="appointment_id" type="hidden" value={selected.id} />
                        <button className="ghost-button danger-text" type="submit">
                          Cancelar sem consumir quota
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <strong>Selecione um agendamento.</strong>
                    <span>Aqui aparecem status, quota e sync Google.</span>
                  </div>
                )}
              </aside>
            </div>
          </section>

          <section className={`view ${view === 'assinantes' ? 'active' : ''}`}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Controle de acesso</p>
                <h2>Assinantes e quota</h2>
              </div>
            </div>
            <div className="data-table glass">
              <div className="table-row table-head">
                <span>Assinante</span>
                <span>Status</span>
                <span>Plano</span>
                <span>Uso do periodo</span>
              </div>
              {subscribers.map((subscriber) => (
                <div className="table-row" key={subscriber.id}>
                  <span>{subscriber.contact_id}</span>
                  <span className={`badge ${subscriber.status === 'active' ? 'subscriber' : 'blocked'}`}>
                    {subscriber.status}
                  </span>
                  <span>{subscriber.plan_name}</span>
                  <span>
                    <i style={{ '--w': `${subscriber.usage_percent}%` } as CSSProperties} />
                    {subscriber.usage_label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className={`view ${view === 'barbeiros' ? 'active' : ''}`}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Equipe</p>
                <h2>Barbeiros e calendarios</h2>
              </div>
            </div>
            <div className="barber-grid">
              {barbers.map((barber) => (
                <article className="barber glass" key={barber.id}>
                  <strong>{barber.name}</strong>
                  <span className={`badge ${barber.google_calendar_id ? 'subscriber' : 'pending'}`}>
                    {barber.google_calendar_id ? 'Calendario conectado' : 'Calendario pendente'}
                  </span>
                  <small>{barber.google_calendar_id ? 'google_calendar_id salvo' : 'sera criado no primeiro sync'}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={`view ${view === 'planos' ? 'active' : ''}`}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Catalogo</p>
                <h2>Planos vendidos</h2>
              </div>
            </div>
            <div className="plan-grid">
              {plans.map((plan) => (
                <article className="plan glass" key={plan.id}>
                  <span>{plan.name}</span>
                  <strong>{currency(plan.price_cents)}</strong>
                  <small>{plan.usage_limit === null ? 'uso ilimitado' : `${plan.usage_limit} usos`} · {plan.billing_cycle}</small>
                </article>
              ))}
            </div>
          </section>

          <section className={`view ${view === 'sync' ? 'active' : ''}`}>
            <div className="section-header">
              <div>
                <p className="eyebrow">Espelho de saida</p>
                <h2>Google Calendar sync</h2>
              </div>
              <form action={retryGoogleSyncFromForm}>
                <button className="primary-button" type="submit">
                  Reprocessar falhas
                </button>
              </form>
            </div>
            <div className="sync-layout">
              <article className="sync-card glass">
                <strong>Fonte da verdade</strong>
                <p>appointments no Supabase. O Google recebe create, update e cancel como espelho.</p>
              </article>
              <article className="sync-card glass">
                <strong>Falhas recentes</strong>
                <p>{syncLogs.length} falha(s) registrada(s) em appointment_google_sync_logs.</p>
              </article>
              <article className="sync-card glass">
                <strong>Sem leitura de volta</strong>
                <p>Nenhum watch channel, nenhum pull do Google. O fluxo segue mao unica.</p>
              </article>
            </div>
          </section>
        </main>
      </div>

      <div className="compose-drawer glass" hidden={!drawerOpen}>
        <div className="panel-heading">
          <p className="eyebrow">Novo agendamento</p>
          <h2>Confirmar horario</h2>
        </div>
        <form action={createAppointmentFromForm} className="drawer-form">
          <label>
            Assinante
            <select name="subscriber_id">
              <option value="">Cliente avulso</option>
              {subscribers.map((subscriber) => (
                <option key={subscriber.id} value={subscriber.id}>
                  {subscriber.contact_id} · {subscriber.status} · {subscriber.usage_label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact ID para avulso
            <input name="contact_id" placeholder="uuid do contact" />
          </label>
          <label>
            Servico
            <input name="service" defaultValue="Corte e barba" />
          </label>
          <label>
            Barbeiro
            <select name="barber_id" required>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <input name="date" type="date" defaultValue={dateInputValue(new Date().toISOString())} required />
          </label>
          <div className="form-grid">
            <label>
              Inicio
              <input name="starts_at_time" type="time" defaultValue="16:00" required />
            </label>
            <label>
              Fim
              <input name="ends_at_time" type="time" defaultValue="16:45" required />
            </label>
          </div>
          <div className="validation-box">
            <span className="status-dot" />
            A action valida active/past_due e quota antes de confirmar.
          </div>
          <button className="primary-button" type="submit">
            Salvar no Supabase
          </button>
          <button className="ghost-button" onClick={() => setDrawerOpen(false)} type="button">
            Fechar
          </button>
        </form>
      </div>
    </>
  )
}
