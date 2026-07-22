'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAutomationsForEvent } from '@/lib/automations/engine'
import type { CreateContactInput, UpdateContactInput } from '@/types/app'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function validateContact(input: CreateContactInput): string | null {
  if (!input.name.trim()) return 'Nome é obrigatório'
  if (input.phone && !/^\d{10,11}$/.test(normalizePhone(input.phone))) {
    return 'Telefone inválido (10 ou 11 dígitos)'
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return 'E-mail inválido'
  }
  return null
}

export async function createContactAction(
  input: CreateContactInput,
  workspaceId: string
): Promise<{ error?: string; id?: string }> {
  const validationError = validateContact(input)
  if (validationError) return { error: validationError }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('contacts')
    .insert({
      workspace_id: workspaceId,
      name: input.name.trim(),
      phone: input.phone ? normalizePhone(input.phone) : null,
      email: input.email.trim() || null,
      company: input.company.trim() || null,
      position: input.position.trim() || null,
      tags: input.tags,
      pipeline_stage_id: input.pipeline_stage_id || null,
    })
    .select('id')
    .limit(1)

  if (error) return { error: 'Erro ao criar contato. Tente novamente.' }

  const newContactId = data?.[0]?.id
  if (newContactId) {
    void runAutomationsForEvent({
      type: 'contact_created',
      workspaceId,
      contactId: newContactId,
    })
  }

  revalidatePath('/dashboard/contacts')
  revalidatePath('/dashboard/pipeline')
  return { id: newContactId }
}

export async function updateContactAction(
  input: UpdateContactInput,
  workspaceId: string
): Promise<{ error?: string }> {
  const validationError = validateContact(input)
  if (validationError) return { error: validationError }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update({
      name: input.name.trim(),
      phone: input.phone ? normalizePhone(input.phone) : null,
      email: input.email.trim() || null,
      company: input.company.trim() || null,
      position: input.position.trim() || null,
      tags: input.tags,
      pipeline_stage_id: input.pipeline_stage_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao salvar contato. Tente novamente.' }

  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${input.id}`)
  revalidatePath('/dashboard/pipeline')
  return {}
}

export async function bulkAddTagAction(
  contactIds: string[],
  tag: string,
  workspaceId: string
): Promise<{ updated: number; error?: string }> {
  if (!tag.trim()) return { updated: 0, error: 'Etiqueta inválida' }
  if (contactIds.length === 0) return { updated: 0 }

  const supabase = await createClient()

  const { data: contactsRaw } = await supabase
    .from('contacts')
    .select('id, tags')
    .in('id', contactIds)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  const contacts = (contactsRaw ?? []) as { id: string; tags: string[] }[]
  const toUpdate = contacts.filter(c => !(c.tags ?? []).includes(tag))

  if (toUpdate.length === 0) return { updated: 0 }

  await Promise.all(
    toUpdate.map(c =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('contacts')
        .update({ tags: [...(c.tags ?? []), tag], updated_at: new Date().toISOString() })
        .eq('id', c.id)
        .eq('workspace_id', workspaceId)
    )
  )

  revalidatePath('/dashboard/contacts')
  return { updated: toUpdate.length }
}

export async function deleteContactAction(
  contactId: string,
  workspaceId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir contato. Tente novamente.' }

  revalidatePath('/dashboard/contacts')
  revalidatePath('/dashboard/pipeline')
  return {}
}
