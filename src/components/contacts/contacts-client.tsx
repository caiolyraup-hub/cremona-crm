'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { ContactsToolbar } from './contacts-toolbar'
import { ContactsTable } from './contacts-table'
import { ContactsPagination } from './contacts-pagination'
import { ContactModal } from './contact-modal'
import { ContactImportModal } from './contact-import-modal'
import { useContacts } from '@/hooks/use-contacts'
import { useWorkspace } from '@/contexts/workspace-context'

interface ContactsClientProps {
  workspaceId: string
  availableTags: string[]
}

export function ContactsClient({ workspaceId, availableTags }: ContactsClientProps) {
  const router = useRouter()
  const workspace = useWorkspace()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const {
    contacts,
    totalCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTag,
    clearTags,
    currentPage,
    setCurrentPage,
    pageSize,
    refetch,
  } = useContacts(workspaceId)

  const description = isLoading
    ? 'Carregando...'
    : totalCount === 0
    ? 'Nenhum contato ainda'
    : `${totalCount} ${totalCount === 1 ? 'contato' : 'contatos'}`

  return (
    <div>
      <PageHeader
        title="Contatos"
        description={description}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Upload size={15} />
              Importar CSV
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 rounded-md bg-[#378ADD] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5]"
            >
              <Plus size={16} />
              Novo contato
            </button>
          </div>
        }
      />

      <ContactsToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onTagToggle={toggleTag}
        onClearTags={clearTags}
        totalCount={totalCount}
        displayedCount={contacts.length}
        isLoading={isLoading}
      />

      <ContactsTable
        contacts={contacts}
        isLoading={isLoading}
        workspaceId={workspaceId}
        availableTags={availableTags}
        onContactClick={id => router.push(`/dashboard/contacts/${id}`)}
        onContactDeleted={refetch}
        onBulkChange={refetch}
      />

      <ContactsPagination
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        isLoading={isLoading}
      />

      <ContactModal
        mode="create"
        stages={workspace.pipeline_stages}
        availableTags={availableTags}
        workspaceId={workspaceId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={refetch}
      />

      <ContactImportModal
        workspaceId={workspaceId}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
