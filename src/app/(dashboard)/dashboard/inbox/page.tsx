import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  canWorkspaceSendWhatsAppMessages,
  getWorkspaceByIdCompatible,
  getWorkspaceIdForUser,
} from '@/lib/workspace-compat'
import { InboxClient } from '@/components/inbox/inbox-client'

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { workspaceId, error: memberError } = await getWorkspaceIdForUser(supabase, user.id)
  if (memberError) throw new Error(memberError.message)
  if (!workspaceId) {
    redirect('/onboarding')
  }

  const { workspace, error: workspaceError } = await getWorkspaceByIdCompatible(
    supabase,
    workspaceId
  )
  if (workspaceError) throw new Error(workspaceError.message)

  const canSendMessages = canWorkspaceSendWhatsAppMessages(workspace)

  return <InboxClient canSendMessages={canSendMessages} />
}
