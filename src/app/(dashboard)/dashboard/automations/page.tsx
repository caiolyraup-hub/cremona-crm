'use client'

import { useState } from 'react'
import { Zap } from 'lucide-react'
import { useWorkspace } from '@/contexts/workspace-context'
import { useAutomations } from '@/hooks/use-automations'
import { AutomationCard } from '@/components/automations/automation-card'
import { AutomationModal, type AutomationPreset } from '@/components/automations/automation-modal'
import { AutomationsWelcome } from '@/components/automations/automations-welcome'
import type { Automation } from '@/types/app'

export default function AutomationsPage() {
  const workspace = useWorkspace()
  const { automations, isLoading, refetch } = useAutomations(workspace.id)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Automation | undefined>()
  const [preset, setPreset] = useState<AutomationPreset | undefined>()

  const stages = (workspace as { pipeline_stages?: { id: string; name: string; pipeline_id: string | null; color: string; position: number; workspace_id: string; created_at: string }[] }).pipeline_stages ?? []

  function openCreate() {
    setEditing(undefined)
    setPreset(undefined)
    setModalOpen(true)
  }

  function openEdit(automation: Automation) {
    setEditing(automation)
    setPreset(undefined)
    setModalOpen(true)
  }

  function openPreset(p: AutomationPreset) {
    setEditing(undefined)
    setPreset(p)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Automações</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Mensagens automáticas quando leads mudam de estágio
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Zap size={15} />
          Nova automação
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <AutomationsWelcome onPreset={openPreset} onCreateCustom={openCreate} />
      ) : (
        <div className="space-y-3">
          {automations.map(automation => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              stages={stages}
              workspaceId={workspace.id}
              onEdit={() => openEdit(automation)}
              onRefetch={refetch}
            />
          ))}
        </div>
      )}

      <AutomationModal
        mode={editing ? 'edit' : 'create'}
        automation={editing}
        workspaceId={workspace.id}
        stages={stages}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={refetch}
        initialValues={preset}
      />
    </div>
  )
}
