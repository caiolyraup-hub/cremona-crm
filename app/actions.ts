'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getWorkspaceId } from '../lib/supabase/server'
import {
  cancelAppointment,
  completeAppointment,
  createAppointment,
  retryFailedGoogleCalendarSyncs,
  updateAppointment,
} from '../lib/subscriptions/actions/appointments'

function value(formData: FormData, name: string) {
  const raw = formData.get(name)
  return typeof raw === 'string' ? raw.trim() : ''
}

function dateTimeWithSaoPauloOffset(date: string, time: string) {
  return `${date}T${time.length === 5 ? `${time}:00` : time}-03:00`
}

function finish(message: string, kind: 'ok' | 'error' = 'ok'): never {
  revalidatePath('/')
  redirect(`/?${kind}=${encodeURIComponent(message)}`)
}

async function currentWorkspaceId() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) finish('Workspace nao encontrado para este usuario.', 'error')
  return workspaceId
}

async function contactIdForSubscriber(subscriberId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscribers')
    .select('contact_id')
    .eq('id', subscriberId)
    .single()

  if (error) finish(error.message, 'error')
  return data.contact_id as string
}

export async function createAppointmentFromForm(formData: FormData) {
  const workspaceId = await currentWorkspaceId()
  const subscriberId = value(formData, 'subscriber_id')
  const explicitContactId = value(formData, 'contact_id')
  const contactId = subscriberId ? await contactIdForSubscriber(subscriberId) : explicitContactId

  const result = await createAppointment({
    workspace_id: workspaceId,
    barber_id: value(formData, 'barber_id'),
    contact_id: contactId,
    subscriber_id: subscriberId || null,
    service: value(formData, 'service'),
    starts_at: dateTimeWithSaoPauloOffset(value(formData, 'date'), value(formData, 'starts_at_time')),
    ends_at: dateTimeWithSaoPauloOffset(value(formData, 'date'), value(formData, 'ends_at_time')),
    status: 'scheduled',
    source: 'panel',
  })

  if (result.error) finish(result.error, 'error')
  finish('Agendamento salvo. Google Calendar sincronizado em best-effort.')
}

export async function completeAppointmentFromForm(formData: FormData) {
  const result = await completeAppointment(value(formData, 'appointment_id'))
  if (result.error) finish(result.error, 'error')
  finish('Atendimento concluido e quota incrementada quando aplicavel.')
}

export async function cancelAppointmentFromForm(formData: FormData) {
  const result = await cancelAppointment(value(formData, 'appointment_id'))
  if (result.error) finish(result.error, 'error')
  finish('Agendamento cancelado sem consumir quota.')
}

export async function rescheduleAppointmentFromForm(formData: FormData) {
  const date = value(formData, 'date')
  const result = await updateAppointment(value(formData, 'appointment_id'), {
    barber_id: value(formData, 'barber_id') || undefined,
    service: value(formData, 'service') || undefined,
    starts_at: dateTimeWithSaoPauloOffset(date, value(formData, 'starts_at_time')),
    ends_at: dateTimeWithSaoPauloOffset(date, value(formData, 'ends_at_time')),
  })

  if (result.error) finish(result.error, 'error')
  finish('Agendamento editado e espelhado no Google em best-effort.')
}

export async function retryGoogleSyncFromForm() {
  const workspaceId = await currentWorkspaceId()
  const result = await retryFailedGoogleCalendarSyncs(workspaceId)
  if (result.error) finish(result.error, 'error')
  if (!result.data) finish('Retry nao retornou resumo de execucao.', 'error')
  finish(`Retry concluido: ${result.data.succeeded} sucesso(s), ${result.data.failed} falha(s).`)
}
