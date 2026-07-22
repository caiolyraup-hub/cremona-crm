'use client'

import { MessageCircle } from 'lucide-react'

type WhatsAppCtaProps = {
  phone: string
  message: string
}

export function WhatsAppCta({ phone, message }: WhatsAppCtaProps) {
  if (!phone) return null

  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_12px_rgba(37,211,102,0.4)] transition-transform hover:scale-105"
      aria-label="Falar com o suporte"
    >
      <span className="pointer-events-none absolute bottom-16 right-0 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        Falar com o suporte
      </span>
      <MessageCircle size={24} aria-hidden="true" />
    </a>
  )
}
