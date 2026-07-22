import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { TasksClient } from './tasks-client'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: members } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)

  if (!members || members.length === 0) redirect('/login')
  const workspaceId = (members[0] as Tables<'workspace_members'>).workspace_id

  const contactId =
    typeof searchParams.contactId === 'string' ? searchParams.contactId : undefined

  let contactName: string | undefined
  if (contactId) {
    const { data: contactData } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      .limit(1)
    const rows = (contactData ?? []) as { name: string }[]
    if (rows.length > 0) contactName = rows[0].name
  }

  return (
    <TasksClient
      workspaceId={workspaceId}
      contactId={contactId}
      contactName={contactName}
    />
  )
}
