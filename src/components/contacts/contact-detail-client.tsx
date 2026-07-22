'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/contexts/workspace-context'
import { ContactDetailHeader } from './contact-detail-header'
import { ContactCard } from './contact-card'
import { ContactTabs } from './contact-tabs'
import { ContactModal } from './contact-modal'
import type { ContactWithStage, SaleWithContact } from '@/types/app'
import type { Tables } from '@/types/database'

interface ContactDetailClientProps {
  contact: ContactWithStage
  activities: Tables<'activities'>[]
  tasks: Tables<'tasks'>[]
  sales: SaleWithContact[]
  workspaceId: string
  availableTags: string[]
}

export function ContactDetailClient({
  contact,
  activities,
  tasks,
  sales,
  workspaceId,
  availableTags,
}: ContactDetailClientProps) {
  const router = useRouter()
  const workspace = useWorkspace()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  return (
    <div>
      <ContactDetailHeader contactName={contact.name} />
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full shrink-0 lg:w-[380px]">
          <ContactCard
            contact={contact}
            tasks={tasks}
            sales={sales}
            workspaceId={workspaceId}
            onEdit={() => setIsEditModalOpen(true)}
            onRefresh={() => router.refresh()}
            availableTags={availableTags}
          />
        </div>
        <div className="min-w-0 flex-1">
          <ContactTabs
            contactId={contact.id}
            workspaceId={workspaceId}
            activities={activities}
          />
        </div>
      </div>

      <ContactModal
        mode="edit"
        contact={contact}
        stages={workspace.pipeline_stages}
        availableTags={availableTags}
        workspaceId={workspaceId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  )
}
