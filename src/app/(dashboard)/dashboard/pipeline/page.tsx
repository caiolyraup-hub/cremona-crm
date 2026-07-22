'use client'

import { useMemo, useState, useCallback } from 'react'
import { Settings2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { PipelineMobile } from '@/components/pipeline/pipeline-mobile'
import { StagesConfigModal } from '@/components/pipeline/stages-config-modal'
import { PipelineFilters } from '@/components/pipeline/pipeline-filters'
import { PipelineSelector } from '@/components/pipeline/pipeline-selector'
import { ContactModal } from '@/components/contacts/contact-modal'
import { TaskModal } from '@/components/tasks/task-modal'
import { useWorkspace } from '@/contexts/workspace-context'
import { usePipeline } from '@/hooks/use-pipeline'
import { useAutomations } from '@/hooks/use-automations'
import { formatCurrency } from '@/lib/formatters'
import { useRouter } from 'next/navigation'

const ACTION_SUMMARY: Record<string, string> = {
  send_whatsapp_text: 'Mensagem enviada para o lead',
  send_whatsapp_template: 'Template enviado para o lead',
  send_whatsapp_media: 'Mídia enviada para o lead',
  create_task: 'Tarefa criada automaticamente',
}

export default function PipelinePage() {
  const workspace = useWorkspace()
  const router = useRouter()

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(
    workspace.pipelines[0]?.id ?? ''
  )

  const handlePipelinesChange = useCallback((newSelectedId?: string) => {
    router.refresh()
    if (newSelectedId) setSelectedPipelineId(newSelectedId)
  }, [router])

  const {
    stages,
    contacts,
    contactsByStage,
    filteredContactsByStage,
    filteredUnstaged,
    totalByStage,
    valueByStage,
    stagesWithAutomations,
    metrics,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,
    allTags,
    isLoading,
    moveContact,
    refetch,
  } = usePipeline(workspace.id, selectedPipelineId)
  const { automations } = useAutomations(workspace.id)

  const automationSummaryByStage = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of automations) {
      if (a.active && a.trigger_type === 'stage_enter' && a.trigger_config?.stage_id) {
        const sid = a.trigger_config.stage_id as string
        if (!map[sid]) {
          map[sid] = `⚡ Ao entrar: ${ACTION_SUMMARY[a.action_type] ?? a.action_type}`
        }
      }
    }
    return map
  }, [automations])

  const [configOpen, setConfigOpen] = useState(false)
  const [addContactStageId, setAddContactStageId] = useState<string | null | undefined>(undefined)
  const [taskContactId, setTaskContactId] = useState<string | null>(null)

  const allContactTags = Array.from(new Set(contacts.flatMap(c => c.tags)))

  const description = isLoading
    ? 'Carregando...'
    : [
        `${metrics.totalInPipeline} no funil`,
        metrics.totalDealValue > 0 ? formatCurrency(metrics.totalDealValue) : null,
        metrics.weeklyMoves > 0
          ? `${metrics.weeklyMoves} ${metrics.weeklyMoves === 1 ? 'movimento' : 'movimentos'} esta semana`
          : null,
      ]
        .filter(Boolean)
        .join(' · ')

  function handleAddContact(stageId: string | null) {
    setAddContactStageId(stageId)
  }

  function handleCreateTask(contactId: string) {
    setTaskContactId(contactId)
  }

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description={description}
        action={
          <div className="flex items-center gap-2">
            {workspace.pipelines.length > 0 && (
              <PipelineSelector
                pipelines={workspace.pipelines}
                selectedId={selectedPipelineId}
                workspaceId={workspace.id}
                onSelect={setSelectedPipelineId}
                onPipelinesChange={handlePipelinesChange}
              />
            )}
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings2 size={15} />
              Configurar etapas
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <PipelineFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              allTags={allTags}
            />
          </div>

          {/* Desktop Kanban */}
          <div className="hidden md:block">
            <div className="-mx-6 -mb-6 bg-gray-100 px-6 pb-6 pt-4">
              <KanbanBoard
                stages={stages}
                contactsByStage={filteredContactsByStage}
                unstagedContacts={filteredUnstaged}
                totalByStage={totalByStage}
                valueByStage={valueByStage}
                stagesWithAutomations={stagesWithAutomations}
                automationSummaryByStage={automationSummaryByStage}
                onMoveContact={moveContact}
                onAddContact={handleAddContact}
                onCreateTask={handleCreateTask}
              />
            </div>
          </div>

          {/* Mobile grouped list */}
          <div className="md:hidden">
            <PipelineMobile
              stages={stages}
              contactsByStage={filteredContactsByStage}
              unstagedContacts={filteredUnstaged}
              valueByStage={valueByStage}
              onAddContact={handleAddContact}
            />
          </div>
        </>
      )}

      <StagesConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        stages={stages}
        contactsByStage={contactsByStage}
        workspaceId={workspace.id}
        pipelineId={selectedPipelineId}
        onSaved={refetch}
      />

      <ContactModal
        mode="create"
        stages={stages}
        availableTags={allContactTags}
        workspaceId={workspace.id}
        isOpen={addContactStageId !== undefined}
        onClose={() => setAddContactStageId(undefined)}
        onSuccess={refetch}
        initialStageId={addContactStageId ?? undefined}
      />

      <TaskModal
        mode="create"
        workspaceId={workspace.id}
        defaultContactId={taskContactId ?? undefined}
        open={!!taskContactId}
        onOpenChange={open => {
          if (!open) setTaskContactId(null)
        }}
        onSuccess={refetch}
      />
    </div>
  )
}
