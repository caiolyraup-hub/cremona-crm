'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ContactDetailHeaderProps {
  contactName: string
}

export function ContactDetailHeader({ contactName }: ContactDetailHeaderProps) {
  const router = useRouter()

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-gray-500 transition-colors hover:text-[#378ADD]"
      >
        <ChevronLeft size={15} />
        Contatos
      </button>
      <ChevronRight size={13} className="text-gray-300" />
      <span className="max-w-[240px] truncate font-medium text-gray-800">{contactName}</span>
    </nav>
  )
}
