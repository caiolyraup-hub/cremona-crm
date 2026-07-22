import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContactDetailClient } from '@/components/contacts/contact-detail-client'
import type { ContactWithStage, SaleWithContact } from '@/types/app'
import type { Tables } from '@/types/database'

interface ContactDetailPageProps {
  params: {
    id: string
  }
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
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

  const [contactResult, activitiesResult, tasksResult, salesResult, tagsResult] =
    await Promise.all([
      supabase
        .from('contacts')
        .select('*, pipeline_stage:pipeline_stages(*)')
        .eq('id', params.id)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .maybeSingle(),
      supabase
        .from('activities')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', params.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', params.id)
        .order('completed_at', { ascending: true, nullsFirst: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', params.id)
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('contacts')
        .select('tags')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null),
    ])

  if (contactResult.error || !contactResult.data) notFound()

  const contact = contactResult.data as unknown as ContactWithStage
  const activities = (activitiesResult.data ?? []) as Tables<'activities'>[]
  const tasks = (tasksResult.data ?? []) as Tables<'tasks'>[]
  const salesRows = (salesResult.data ?? []) as Tables<'sales'>[]
  const sales: SaleWithContact[] = salesRows.map(sale => ({
    ...sale,
    contact: {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      company: contact.company,
    },
  }))
  const tagsData = (tagsResult.data ?? []) as { tags: string[] }[]
  const availableTags = Array.from(new Set(tagsData.flatMap(c => c.tags ?? []))).sort()

  return (
    <ContactDetailClient
      contact={contact}
      activities={activities}
      tasks={tasks}
      sales={sales}
      workspaceId={workspaceId}
      availableTags={availableTags}
    />
  )
}
