'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { moveContactStageAction } from '@/app/(dashboard)/dashboard/pipeline/actions'
import type { Tables } from '@/types/database'
import type { KanbanContact } from '@/types/app'

export interface PipelineMetrics {
  totalInPipeline: number
  totalDealValue: number
  weeklyMoves: number
}

export interface UsePipelineResult {
  stages: Tables<'pipeline_stages'>[]
  contacts: KanbanContact[]
  contactsByStage: Record<string, KanbanContact[]>
  unstagedContacts: KanbanContact[]
  filteredContactsByStage: Record<string, KanbanContact[]>
  filteredUnstaged: KanbanContact[]
  totalByStage: Record<string, number>
  valueByStage: Record<string, number>
  stagesWithAutomations: Set<string>
  metrics: PipelineMetrics
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  allTags: string[]
  isLoading: boolean
  moveContact: (contactId: string, newStageId: string | null) => void
  addContact: (contact: KanbanContact) => void
  refetch: () => void
}

export function usePipeline(workspaceId: string, pipelineId: string): UsePipelineResult {
  const [stages, setStages] = useState<Tables<'pipeline_stages'>[]>([])
  const [contacts, setContacts] = useState<KanbanContact[]>([])
  const [weeklyMoves, setWeeklyMoves] = useState(0)
  const [stagesWithAutomations, setStagesWithAutomations] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [fetchTrigger, setFetchTrigger] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const contactsRef = useRef<KanbanContact[]>([])

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      const supabase = createClient()

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [stagesResult, contactsResult, activitiesResult, automationsResult] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('pipeline_id', pipelineId)
          .order('position'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('contacts')
          .select('id, name, phone, company, tags, pipeline_stage_id, deals(value, status), tasks(completed_at), sales(id)')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('activities')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .eq('type', 'stage_change')
          .gte('created_at', weekAgo),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from('automations')
          .select('trigger_config')
          .eq('workspace_id', workspaceId)
          .eq('active', true)
          .eq('trigger_type', 'stage_enter'),
      ])

      if (cancelled) return

      setStages((stagesResult.data ?? []) as Tables<'pipeline_stages'>[])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const automationRows = (automationsResult.data ?? []) as Array<{ trigger_config: any }>
      const withAutomations = new Set<string>(
        automationRows
          .map(r => r.trigger_config?.stage_id as string | undefined)
          .filter((id): id is string => !!id)
      )
      setStagesWithAutomations(withAutomations)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawContacts = (contactsResult.data ?? []) as any[]
      const mappedContacts: KanbanContact[] = rawContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        company: c.company ?? null,
        tags: c.tags ?? [],
        pipeline_stage_id: c.pipeline_stage_id ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deal_value: (c.deals ?? []).find((d: any) => d.status === 'open')?.value ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        open_task_count: (c.tasks ?? []).filter((t: any) => !t.completed_at).length,
        sales_count: (c.sales ?? []).length,
      }))

      setContacts(mappedContacts)
      setWeeklyMoves((activitiesResult as { count: number | null }).count ?? 0)
      setIsLoading(false)
    }

    fetchData()
    return () => { cancelled = true }
  }, [workspaceId, pipelineId, fetchTrigger])

  const contactsByStage = useMemo(() => {
    const groups: Record<string, KanbanContact[]> = {}
    stages.forEach(s => { groups[s.id] = [] })
    contacts
      .filter(c => c.pipeline_stage_id !== null)
      .forEach(c => {
        const sid = c.pipeline_stage_id!
        if (groups[sid]) groups[sid].push(c)
      })
    return groups
  }, [contacts, stages])

  const unstagedContacts = useMemo(
    () => contacts.filter(c => c.pipeline_stage_id === null),
    [contacts]
  )

  const totalByStage = useMemo(
    () => Object.fromEntries(Object.entries(contactsByStage).map(([id, cs]) => [id, cs.length])),
    [contactsByStage]
  )

  const valueByStage = useMemo(() => {
    const values: Record<string, number> = {}
    stages.forEach(s => { values[s.id] = 0 })
    contacts
      .filter(c => c.pipeline_stage_id && c.deal_value)
      .forEach(c => {
        values[c.pipeline_stage_id!] = (values[c.pipeline_stage_id!] ?? 0) + c.deal_value!
      })
    return values
  }, [contacts, stages])

  const metrics = useMemo<PipelineMetrics>(() => {
    const stageIds = new Set(stages.map(s => s.id))
    const inPipeline = contacts.filter(c => c.pipeline_stage_id !== null && stageIds.has(c.pipeline_stage_id))
    return {
      totalInPipeline: inPipeline.length,
      totalDealValue: inPipeline.reduce((sum, c) => sum + (c.deal_value ?? 0), 0),
      weeklyMoves,
    }
  }, [contacts, stages, weeklyMoves])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    contacts.forEach(c => c.tags.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [contacts])

  // Apply search + tag filters
  function applyFilters(list: KanbanContact[]): KanbanContact[] {
    let result = list
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        c => c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
      )
    }
    if (selectedTags.length > 0) {
      result = result.filter(c => selectedTags.every(t => c.tags.includes(t)))
    }
    return result
  }

  const filteredContactsByStage = useMemo(() => {
    const filtered: Record<string, KanbanContact[]> = {}
    for (const [sid, cs] of Object.entries(contactsByStage)) {
      filtered[sid] = applyFilters(cs)
    }
    return filtered
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsByStage, searchQuery, selectedTags])

  const filteredUnstaged = useMemo(
    () => applyFilters(unstagedContacts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unstagedContacts, searchQuery, selectedTags]
  )

  const moveContact = useCallback(
    (contactId: string, newStageId: string | null) => {
      const previousContacts = contactsRef.current

      setContacts(prev =>
        prev.map(c => c.id === contactId ? { ...c, pipeline_stage_id: newStageId } : c)
      )

      moveContactStageAction(contactId, newStageId, workspaceId).then(result => {
        if (result.error) {
          toast.error(result.error)
          setContacts(previousContacts)
        }
      })
    },
    [workspaceId]
  )

  const addContact = useCallback((contact: KanbanContact) => {
    setContacts(prev => [contact, ...prev])
  }, [])

  const refetch = useCallback(() => setFetchTrigger(n => n + 1), [])

  return {
    stages,
    contacts,
    contactsByStage,
    unstagedContacts,
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
    addContact,
    refetch,
  }
}
