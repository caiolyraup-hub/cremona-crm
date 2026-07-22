'use client'

import { useEffect, useRef, useTransition } from 'react'
import { motion } from 'framer-motion'
import { completeOnboardingAction } from '@/app/onboarding/actions'

interface StepCompleteProps {
  businessName: string
  stageCount: number
  contactCount: number
  isWhatsAppConfigured: boolean
}

export function StepComplete({
  businessName,
  stageCount,
  contactCount,
  isWhatsAppConfigured,
}: StepCompleteProps) {
  const [isPending, startTransition] = useTransition()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true

    import('canvas-confetti').then(({ default: confetti }) => {
      requestAnimationFrame(() => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#378ADD', '#22C55E', '#EAB308', '#EC4899', '#8B5CF6'],
        })

        confetti({
          particleCount: 90,
          spread: 55,
          origin: { x: 0.2, y: 0.7 },
          colors: ['#378ADD', '#22C55E', '#EAB308'],
        })

        confetti({
          particleCount: 90,
          spread: 55,
          origin: { x: 0.8, y: 0.7 },
          colors: ['#378ADD', '#22C55E', '#EC4899'],
        })
      })
    })
  }, [])

  function handleGo() {
    startTransition(async () => {
      await completeOnboardingAction()
    })
  }

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path
            d="M8 20l9 9 15-15"
            stroke="#22C55E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Tudo pronto!</h2>
        <p className="mb-8 text-sm text-gray-500">
          Seu workspace esta configurado. Vamos abrir o painel inicial.
        </p>

        <div className="mb-8 grid gap-3 text-left sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Negocio</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{businessName}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Etapas</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{stageCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">Contatos</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{contactCount}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400">WhatsApp</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {isWhatsAppConfigured ? '✓ WhatsApp conectado' : '○ WhatsApp: configurar depois'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGo}
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Abrindo...' : 'Ir para o painel'}
        </button>
      </motion.div>
    </div>
  )
}
