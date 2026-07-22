'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createNoteAction(
  contactId: string,
  workspaceId: string,
  content: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('activities').insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    type: 'note',
    content,
  })

  if (error) return { error: 'Erro ao criar nota' }

  revalidatePath(`/dashboard/contacts/${contactId}`)
  return { error: null }
}

export async function deleteNoteAction(
  noteId: string,
  workspaceId: string,
  contactId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', noteId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir nota' }

  revalidatePath(`/dashboard/contacts/${contactId}`)
  return { error: null }
}

export async function updateContactTagsAction(
  contactId: string,
  workspaceId: string,
  tags: string[]
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contacts')
    .update({ tags, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar tags' }

  revalidatePath(`/dashboard/contacts/${contactId}`)
  return { error: null }
}
