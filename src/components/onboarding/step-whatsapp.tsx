'use client'

import { useMemo, useState, useTransition } from 'react'
import { CheckCircle2, MessageCircle, PlugZap } from 'lucide-react'
import { toast } from 'sonner'
import { maskWhatsAppToken } from '@/lib/whatsapp/format'
import {
  testWhatsAppConnectionAction,
  updateWhatsAppSettingsAction,
} from '@/app/(dashboard)/dashboard/settings/actions'

interface StepWhatsappProps {
  workspace: {
    id: string
    whatsapp_phone_number_id: string | null
    whatsapp_business_account_id: string | null
    whatsapp_phone: string | null
    has_whatsapp_token: boolean
  }
  onNext: (configured: boolean) => void
  onBack: () => void
}

export function StepWhatsapp({ workspace, onNext, onBack }: StepWhatsappProps) {
  const [isFormVisible, setIsFormVisible] = useState(
    Boolean(
      workspace.whatsapp_phone_number_id && workspace.whatsapp_phone && workspace.has_whatsapp_token
    )
  )
  const [phoneNumberId, setPhoneNumberId] = useState(workspace.whatsapp_phone_number_id ?? '')
  const [businessAccountId, setBusinessAccountId] = useState(
    workspace.whatsapp_business_account_id ?? ''
  )
  const [whatsAppPhone, setWhatsAppPhone] = useState(workspace.whatsapp_phone ?? '')
  const [token, setToken] = useState('')
  const [isSaving, startSaving] = useTransition()
  const [isTesting, startTesting] = useTransition()

  const isConfigured = useMemo(
    () =>
      Boolean(
        (workspace.has_whatsapp_token || token.trim()) &&
        (phoneNumberId.trim() || workspace.whatsapp_phone_number_id) &&
        (whatsAppPhone.trim() || workspace.whatsapp_phone)
      ),
    [
      phoneNumberId,
      token,
      whatsAppPhone,
      workspace.has_whatsapp_token,
      workspace.whatsapp_phone,
      workspace.whatsapp_phone_number_id,
    ]
  )

  async function saveSettings(shouldTest: boolean) {
    const result = await updateWhatsAppSettingsAction(workspace.id, {
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_business_account_id: businessAccountId,
      whatsapp_phone: whatsAppPhone,
      whatsapp_token: token,
    })

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (shouldTest) {
      const testResult = await testWhatsAppConnectionAction(workspace.id)
      if (testResult.error) {
        toast.error(testResult.error)
        return
      }

      toast.success('WhatsApp conectado com sucesso.')
    } else {
      toast.success('Configuracao do WhatsApp salva.')
    }

    onNext(true)
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
          <MessageCircle size={20} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Integracao com WhatsApp</h2>
          <p className="text-sm text-gray-500">Receba e envie mensagens direto pelo Cremona</p>
        </div>
      </div>

      {!isFormVisible ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Conectar WhatsApp agora</p>
              <p className="mt-1 text-sm text-gray-500">
                Configure o numero principal do negocio para centralizar o atendimento no CRM.
              </p>
            </div>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 size={12} />
                Ja configurado
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                Configuracao opcional
              </span>
            )}
          </div>

          <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
            <div className="rounded-xl bg-white px-4 py-3">Inbox em tempo real por contato</div>
            <div className="rounded-xl bg-white px-4 py-3">Historico salvo no CRM</div>
            <div className="rounded-xl bg-white px-4 py-3">Envio basico de texto pela Meta</div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => onNext(isConfigured)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Pular por agora
            </button>
            <button
              type="button"
              onClick={() => setIsFormVisible(true)}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Conectar WhatsApp agora
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Credenciais da Meta Cloud API</p>
              <p className="mt-1 text-sm text-gray-500">
                Esta etapa e opcional. Se preferir, voce pode concluir o onboarding e configurar depois.
              </p>
            </div>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 size={12} />
                Pronto para conectar
              </span>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(event.target.value)}
                placeholder="Ex: 123456789012345"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                WhatsApp Business Account ID
              </label>
              <input
                type="text"
                value={businessAccountId}
                onChange={(event) => setBusinessAccountId(event.target.value)}
                placeholder="Ex: 987654321098765"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Numero WhatsApp</label>
              <input
                type="text"
                value={whatsAppPhone}
                onChange={(event) => setWhatsAppPhone(event.target.value)}
                placeholder="Ex: +55 82 99999-9999"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Token de acesso</label>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={
                  workspace.has_whatsapp_token
                    ? maskWhatsAppToken('token-configurado')
                    : 'Cole aqui o token da Meta'
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => onNext(isConfigured)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Pular por agora
            </button>
            <button
              type="button"
              onClick={() =>
                startSaving(async () => {
                  await saveSettings(false)
                })
              }
              disabled={isSaving || isTesting}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar e continuar'}
            </button>
            <button
              type="button"
              onClick={() =>
                startTesting(async () => {
                  await saveSettings(true)
                })
              }
              disabled={isSaving || isTesting}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
            >
              <PlugZap size={15} />
              {isTesting ? 'Testando...' : 'Salvar e testar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
