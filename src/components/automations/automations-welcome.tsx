'use client'

import { Zap } from 'lucide-react'
import type { AutomationPreset } from './automation-modal'

const PRESETS: Array<{
  emoji: string
  title: string
  subtitle: string
  preset: AutomationPreset
}> = [
  {
    emoji: '🎉',
    title: 'Boas-vindas ao novo lead',
    subtitle: 'Gatilho: novo contato criado',
    preset: {
      name: 'Boas-vindas',
      triggerType: 'contact_created',
      actionType: 'send_whatsapp_text',
      message: 'Olá {{contact_name}}! Obrigado pelo contato. Em breve te retorno 😊',
    },
  },
  {
    emoji: '📋',
    title: 'Lembrete de proposta',
    subtitle: 'Gatilho: entra em Proposta enviada',
    preset: {
      name: 'Lembrete de proposta',
      triggerType: 'stage_enter',
      actionType: 'send_whatsapp_text',
      message: 'Oi {{contact_name}}, você recebeu nossa proposta. Tem alguma dúvida que posso ajudar?',
      delayMinutes: 1440,
    },
  },
  {
    emoji: '🏆',
    title: 'Parabéns pelo fechamento',
    subtitle: 'Gatilho: entra em Fechado',
    preset: {
      name: 'Celebração de fechamento',
      triggerType: 'stage_enter',
      actionType: 'send_whatsapp_text',
      message: 'Parabéns {{contact_name}}! Seja bem-vindo(a) como cliente. Estou à disposição para o que precisar!',
    },
  },
]

interface AutomationsWelcomeProps {
  onPreset: (preset: AutomationPreset) => void
  onCreateCustom: () => void
}

export function AutomationsWelcome({ onPreset, onCreateCustom }: AutomationsWelcomeProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
          <Zap size={28} className="text-blue-600" />
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-900">Automatize seu WhatsApp</p>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            Configure mensagens automáticas para seus leads. Quando um cliente entrar em uma etapa
            do pipeline, o Cremona envia a mensagem certa na hora certa, sem você precisar fazer nada.
          </p>
        </div>
      </div>

      <div className="w-full max-w-[560px] space-y-2">
        {PRESETS.map(({ emoji, title, subtitle, preset }) => (
          <button
            key={title}
            onClick={() => onPreset(preset)}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onCreateCustom}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Criar automação personalizada
      </button>
    </div>
  )
}
