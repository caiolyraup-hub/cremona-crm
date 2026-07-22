'use client'

import { useEffect } from 'react'

export function useDocumentTitle(pageTitle: string, workspaceName?: string) {
  useEffect(() => {
    const base = workspaceName ? `${pageTitle} | ${workspaceName}` : pageTitle
    document.title = base
    return () => {
      document.title = workspaceName ?? 'CRM'
    }
  }, [pageTitle, workspaceName])
}
