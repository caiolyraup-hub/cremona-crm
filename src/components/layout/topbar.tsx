'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Ordered from most-specific to least-specific so prefix matching works correctly
const PAGE_TITLES: Array<[string, string]> = [
  ['/dashboard/contacts', 'Contatos'],
  ['/dashboard/pipeline', 'Pipeline'],
  ['/dashboard/inbox', 'WhatsApp'],
  ['/dashboard/tasks', 'Tarefas'],
  ['/dashboard/sales', 'Vendas'],
  ['/dashboard/settings', 'Configurações'],
  ['/dashboard', 'Início'],
]

function getPageTitle(pathname: string): string {
  const match = PAGE_TITLES.find(([path]) => pathname === path || pathname.startsWith(path + '/'))
  return match ? match[1] : 'Dashboard'
}

function getInitials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (words.length === 1 && words[0].length > 0) return words[0][0].toUpperCase()
  return (email[0] ?? '?').toUpperCase()
}

interface TopbarProps {
  userName: string
  userEmail: string
}

export function Topbar({ userName, userEmail }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const title = getPageTitle(pathname)
  const initials = getInitials(userName, userEmail)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-gray-800">{title}</h1>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-800 transition-colors duration-150 hover:bg-blue-200"
          aria-label="Menu do usuário"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-gray-900">{userName || 'Usuário'}</p>
              <p className="truncate text-xs text-gray-400">{userEmail}</p>
            </div>
            <div className="border-t border-gray-100" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-gray-50"
            >
              <LogOut size={14} />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
