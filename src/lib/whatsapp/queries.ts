import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

export async function getUnreadWhatsAppCount(workspaceId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('contact_id')
    .eq('workspace_id', workspaceId)
    .eq('direction', 'inbound')
    .neq('status', 'read')
    .not('contact_id', 'is', null)

  if (error) {
    console.warn('WhatsApp badge: erro ao contar conversas nao lidas.', error.message)
    return 0
  }

  const rows = (data ?? []) as Array<Pick<Tables<'messages'>, 'contact_id'>>

  return new Set(rows.map((row) => row.contact_id).filter(Boolean)).size
}

export async function getLastInboundMessageAt(params: {
  workspaceId: string
  contactId: string
}): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('messages')
    .select('created_at')
    .eq('workspace_id', params.workspaceId)
    .eq('contact_id', params.contactId)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error('Nao foi possivel buscar a ultima mensagem inbound deste contato.')
  }

  return (data as Pick<Tables<'messages'>, 'created_at'> | null)?.created_at ?? null
}
