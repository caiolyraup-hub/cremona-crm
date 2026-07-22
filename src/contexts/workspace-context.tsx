'use client'

import { createContext, useContext } from 'react'
import type { WorkspaceWithStages } from '@/types/app'

const WorkspaceContext = createContext<WorkspaceWithStages | null>(null)

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: WorkspaceWithStages
  children: React.ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceWithStages {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
