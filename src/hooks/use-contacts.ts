import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ContactWithStage } from '@/types/app'

export const PAGE_SIZE = 20

function readTagsStorage(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = sessionStorage.getItem('contacts-tags')
    return saved ? (JSON.parse(saved) as string[]) : []
  } catch {
    return []
  }
}

function writeTagsStorage(tags: string[]) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('contacts-tags', JSON.stringify(tags))
  }
}

export interface UseContactsResult {
  contacts: ContactWithStage[]
  totalCount: number
  isLoading: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTags: string[]
  toggleTag: (tag: string) => void
  clearTags: () => void
  currentPage: number
  setCurrentPage: (p: number) => void
  pageSize: number
  refetch: () => void
}

export function useContacts(workspaceId: string): UseContactsResult {
  const [contacts, setContacts] = useState<ContactWithStage[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(() => readTagsStorage())
  const [currentPage, setCurrentPage] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setCurrentPage(0)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    setCurrentPage(0)
  }, [selectedTags])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      writeTagsStorage(next)
      return next
    })
  }, [])

  const clearTags = useCallback(() => {
    setSelectedTags([])
    writeTagsStorage([])
  }, [])

  const refetch = useCallback(() => setFetchTrigger(n => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function fetchContacts() {
      setIsLoading(true)
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('contacts')
        .select('*, pipeline_stage:pipeline_stages(id, name, color)', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

      const q = debouncedQuery.trim()
      if (q) {
        query = query.or(
          `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,company.ilike.%${q}%`
        )
      }

      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags)
      }

      const { data, count, error } = await query

      if (cancelled) return

      if (!error && data) {
        setContacts(data as unknown as ContactWithStage[])
        setTotalCount(count ?? 0)
      }

      setIsLoading(false)
    }

    fetchContacts()
    return () => { cancelled = true }
  }, [workspaceId, debouncedQuery, selectedTags, currentPage, fetchTrigger])

  return {
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
    pageSize: PAGE_SIZE,
    refetch,
  }
}
