import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { ContactsClient } from '@/components/contacts/contacts-client'

export default async function ContactsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) redirect('/login')

  const workspaceId = (members[0] as Tables<'workspace_members'>).workspace_id

  const { data: tagsRaw } = await supabase
    .from('contacts')
    .select('tags')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  const tagsData = (tagsRaw ?? []) as { tags: string[] }[]
  const availableTags = Array.from(
    new Set(tagsData.flatMap(c => c.tags ?? []))
  ).sort()

  return <ContactsClient workspaceId={workspaceId} availableTags={availableTags} />
}
