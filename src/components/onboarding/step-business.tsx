'use client'

import { useState, useTransition } from 'react'
import { Briefcase, Building2, HeartPulse, Megaphone, Store, Wrench } from 'lucide-react'
import { updateOnboardingStep1Action } from '@/app/onboarding/actions'

const BUSINESS_TYPES = [
  {
    label: 'Loja fisica',
    description: 'Atendimento presencial e vendas no balcao',
    icon: Store,
  },
  {
    label: 'Servicos',
    description: 'Prestacao de servicos recorrentes ou sob demanda',
    icon: Wrench,
  },
  {
    label: 'Agencia',
    description: 'Marketing, design, trafego e conteudo',
    icon: Megaphone,
  },
  {
    label: 'Consultoria',
    description: 'Projetos, diagnosticos e acompanhamento',
    icon: Briefcase,
  },
  {
    label: 'Saude',
    description: 'Clinicas, consultorios e atendimento humanizado',
    icon: HeartPulse,
  },
  {
    label: 'Outro',
    description: 'Um modelo de negocio diferente dos acima',
    icon: Building2,
  },
]

interface StepBusinessProps {
  workspace: {
    name: string
    business_name: string | null
    business_type: string | null
  }
  onSaved: (businessName: string) => void
  onNext: () => void
}

export function StepBusiness({ workspace, onSaved, onNext }: StepBusinessProps) {
  const [businessName, setBusinessName] = useState(workspace.business_name ?? workspace.name)
  const [businessType, setBusinessType] = useState(workspace.business_type ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('business_name', businessName)
    fd.append('business_type', businessType)

    startTransition(async () => {
      await updateOnboardingStep1Action(fd)
      onSaved(businessName.trim())
      onNext()
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Building2 size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sobre seu negocio</h2>
          <p className="text-sm text-gray-500">Como chamamos sua empresa?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome do negocio
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Ex: Agencia Fenix"
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Tipo de negocio
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_TYPES.map((type) => {
              const Icon = type.icon

              return (
                <button
                  key={type.label}
                  type="button"
                  onClick={() => setBusinessType(type.label)}
                  className="rounded-2xl border p-4 text-left transition-colors"
                  style={{
                    borderColor: businessType === type.label ? '#378ADD' : '#e5e7eb',
                    backgroundColor: businessType === type.label ? '#eff6ff' : '#fff',
                  }}
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <Icon
                      size={18}
                      className={businessType === type.label ? 'text-blue-600' : 'text-gray-500'}
                    />
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: businessType === type.label ? '#2563eb' : '#111827' }}
                  >
                    {type.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{type.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending || !businessName.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Salvando...' : 'Continuar'}
          </button>
        </div>
      </form>
    </div>
  )
}
