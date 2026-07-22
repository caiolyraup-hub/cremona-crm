'use server'

import { revalidatePath } from 'next/cache'
import { getDateKey, getTodayDateKey } from '@/lib/formatters'
import {
  buildSalesSummary,
  formatSaleActivity,
  formatSalePaymentActivity,
  getDateRange,
  mapSaleRow,
  normalizePaymentMethod,
} from '@/lib/sales'
import { sendMetaPurchaseEvent } from '@/lib/meta/conversions'
import { createClient } from '@/lib/supabase/server'
import type { CreateSaleInput, SalesPeriod, SalesSummary, SaleWithContact } from '@/types/app'
import type { Tables } from '@/types/database'

function validateSalePayload(
  input: Partial<CreateSaleInput>,
  options: { partial?: boolean } = {}
): { data: Record<string, unknown> | null; error: string | null } {
  const partial = options.partial ?? false
  const payload: Record<string, unknown> = {}

  if (!partial || input.product_name !== undefined) {
    const productName = input.product_name?.trim() ?? ''
    if (productName.length < 2) {
      return { data: null, error: 'Produto ou servico deve ter pelo menos 2 caracteres' }
    }
    if (productName.length > 200) {
      return { data: null, error: 'Produto ou servico deve ter no maximo 200 caracteres' }
    }
    payload.product_name = productName
  }

  if (!partial || input.value !== undefined) {
    const value = Number(input.value)
    if (!Number.isFinite(value) || value <= 0) {
      return { data: null, error: 'Valor deve ser maior que zero' }
    }
    payload.value = value
  }

  if (!partial || input.sale_date !== undefined) {
    const saleDate = getDateKey(input.sale_date)
    if (!saleDate) return { data: null, error: 'Data da venda invalida' }
    payload.sale_date = saleDate
  }

  if (!partial || input.payment_method !== undefined) {
    const paymentMethod = normalizePaymentMethod(input.payment_method)
    if (!paymentMethod) {
      return { data: null, error: 'Forma de pagamento invalida' }
    }
    payload.payment_method = paymentMethod
  }

  if (!partial || input.status !== undefined) {
    if (!input.status || !['paid', 'pending', 'cancelled'].includes(input.status)) {
      return { data: null, error: 'Status invalido' }
    }
    payload.status = input.status
  }

  if (input.contact_id !== undefined) {
    payload.contact_id = input.contact_id || null
  }

  if (input.notes !== undefined) {
    const notes = input.notes?.trim() ?? ''
    if (notes.length > 1000) {
      return { data: null, error: 'Observacoes devem ter no maximo 1000 caracteres' }
    }
    payload.notes = notes || null
  }

  return { data: payload, error: null }
}

async function revalidateSalePaths(contactIds: Array<string | null | undefined>) {
  const uniqueContactIds = Array.from(new Set(contactIds.filter(Boolean)))

  revalidatePath('/dashboard/sales')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard', 'layout')

  for (const contactId of uniqueContactIds) {
    revalidatePath(`/dashboard/contacts/${contactId}`)
  }
}

async function sendPurchaseEventSafely(
  supabase: unknown,
  sale: Tables<'sales'>
): Promise<void> {
  try {
    await sendMetaPurchaseEvent(supabase as never, {
      id: sale.id,
      workspace_id: sale.workspace_id,
      contact_id: sale.contact_id,
      product_name: sale.product_name,
      value: sale.value,
      status: sale.status,
    })
  } catch (error) {
    console.error('Meta Purchase event failed', error)
  }
}

export async function createSaleAction(
  data: CreateSaleInput,
  workspaceId: string
): Promise<{ data: Tables<'sales'> | null; error: string | null }> {
  const validated = validateSalePayload(data)
  if (validated.error) return { data: null, error: validated.error }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sale, error } = await (supabase as any)
    .from('sales')
    .insert({
      workspace_id: workspaceId,
      ...validated.data,
    })
    .select('*')
    .single()

  if (error) return { data: null, error: 'Erro ao criar lancamento' }

  const createdSale = mapSaleRow(sale as Tables<'sales'>)

  if (createdSale.contact_id) {
    const activities = [
      {
        workspace_id: workspaceId,
        contact_id: createdSale.contact_id,
        type: 'sale',
        content: formatSaleActivity(createdSale.product_name, Number(createdSale.value ?? 0)),
      },
    ]

    if (createdSale.status === 'paid') {
      activities.push({
        workspace_id: workspaceId,
        contact_id: createdSale.contact_id,
        type: 'sale',
        content: formatSalePaymentActivity(Number(createdSale.value ?? 0)),
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activities').insert(activities)
  }

  if (createdSale.status === 'paid') {
    await sendPurchaseEventSafely(supabase, createdSale as Tables<'sales'>)
  }

  await revalidateSalePaths([createdSale.contact_id])
  return { data: createdSale, error: null }
}

export async function updateSaleAction(
  id: string,
  data: Partial<CreateSaleInput>,
  workspaceId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: existingRows } = await supabase
    .from('sales')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .limit(1)

  const existing = (existingRows ?? []) as Tables<'sales'>[]
  if (existing.length === 0) return { error: 'Lancamento nao encontrado' }

  const validated = validateSalePayload(data, { partial: true })
  if (validated.error) return { error: validated.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updatedSale, error } = await (supabase as any)
    .from('sales')
    .update(validated.data)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) return { error: 'Erro ao atualizar lancamento' }

  const nextContactId =
    data.contact_id !== undefined ? data.contact_id || null : existing[0].contact_id

  if (updatedSale?.status === 'paid' && existing[0].status !== 'paid') {
    await sendPurchaseEventSafely(supabase, updatedSale as Tables<'sales'>)
  }

  await revalidateSalePaths([existing[0].contact_id, nextContactId])
  return { error: null }
}

export async function deleteSaleAction(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: existingRows } = await supabase
    .from('sales')
    .select('contact_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .limit(1)

  const existing = (existingRows ?? []) as Array<{ contact_id: string | null }>
  if (existing.length === 0) return { error: 'Lancamento nao encontrado' }

  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir lancamento' }

  await revalidateSalePaths([existing[0].contact_id])
  return { error: null }
}

export async function getSalesSummaryAction(
  workspaceId: string,
  period: SalesPeriod,
  customStart?: string,
  customEnd?: string,
  contactId?: string
): Promise<SalesSummary> {
  const supabase = await createClient()
  const range = getDateRange(period, customStart, customEnd)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('sales')
    .select('*, contact:contacts(id, name, phone, company)')
    .eq('workspace_id', workspaceId)
    .gte('sale_date', formatDateKey(range.start))
    .lte('sale_date', formatDateKey(range.end))
    .order('sale_date', { ascending: true })

  if (contactId) {
    query = query.eq('contact_id', contactId)
  }

  const { data, error } = await query
  if (error) {
    return {
      totalPaid: 0,
      totalPending: 0,
      totalCancelled: 0,
      count: 0,
      averageTicket: 0,
      topProducts: [],
      weeklyData: [],
    }
  }

  return buildSalesSummary((data ?? []).map(mapSaleRow) as SaleWithContact[], period, customStart, customEnd)
}

function formatDateKey(date: Date): string {
  return getDateKey(date.toISOString()) || getTodayDateKey()
}

export { getDateRange }
