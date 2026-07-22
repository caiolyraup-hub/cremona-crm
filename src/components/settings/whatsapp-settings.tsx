'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, MessageCircle, PlugZap, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { maskWhatsAppToken } from '@/lib/whatsapp/format'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  disconnectWhatsAppAction,
  testWhatsAppConnectionAction,
  updateWhatsAppSettingsAction,
} from '@/app/(dashboard)/dashboard/settings/actions'

interface WhatsappSettingsProps {
  workspace: {
    id: string
    whatsapp_provider: 'meta_cloud' | 'twilio'
    whatsapp_phone_number_id: string | null
    whatsapp_business_account_id: string | null
    whatsapp_phone: string | null
    twilio_whatsapp_from: string | null
    twilio_content_sid_new_lead: string | null
    has_whatsapp_token: boolean
  }
  diagnostics: {
    hasVerifyToken: boolean
    hasAppSecret: boolean
    warnings: string[]
    suggestedWebhookUrl: string
  }
}

type ConnectionFeedback =
  | { tone: 'success'; message: string }
  | { tone: 'error'; message: string }
  | null

export function WhatsappSettings({ workspace, diagnostics }: WhatsappSettingsProps) {
  const router = useRouter()
  const [provider, setProvider] = useState<'meta_cloud' | 'twilio'>(
    workspace.whatsapp_provider ?? 'meta_cloud'
  )
  const [phoneNumberId, setPhoneNumberId] = useState(workspace.whatsapp_phone_number_id ?? '')
  const [businessAccountId, setBusinessAccountId] = useState(
    workspace.whatsapp_business_account_id ?? ''
  )
  const [whatsAppPhone, setWhatsAppPhone] = useState(workspace.whatsapp_phone ?? '')
  const [twilioFrom, setTwilioFrom] = useState(workspace.twilio_whatsapp_from ?? '')
  const [twilioContentSid, setTwilioContentSid] = useState(
    workspace.twilio_content_sid_new_lead ?? ''
  )
  const [token, setToken] = useState('')
  const [connectionFeedback, setConnectionFeedback] = useState<ConnectionFeedback>(null)
  const [isSaving, startSaving] = useTransition()
  const [isTesting, startTesting] = useTransition()
  const [isDisconnecting, startDisconnecting] = useTransition()

  const hasExistingMinimumConfig =
    provider === 'twilio'
      ? Boolean(workspace.twilio_whatsapp_from)
      : Boolean(
          workspace.whatsapp_phone_number_id && workspace.whatsapp_phone && workspace.has_whatsapp_token
        )
  const hasMinimumConfig =
    provider === 'twilio'
      ? Boolean(twilioFrom.trim())
      : Boolean(
          phoneNumberId.trim() &&
            whatsAppPhone.trim() &&
            (token.trim() || workspace.has_whatsapp_token)
        )
  const hasPartialConfig = !hasExistingMinimumConfig && Boolean(
    phoneNumberId.trim() ||
      whatsAppPhone.trim() ||
      businessAccountId.trim() ||
      twilioFrom.trim() ||
      twilioContentSid.trim() ||
      token.trim() ||
      workspace.has_whatsapp_token
  )
  const isConnected = hasExistingMinimumConfig
  const statusTitle = isConnected
    ? 'WhatsApp configurado'
    : hasPartialConfig
      ? 'Configuracao incompleta'
      : 'WhatsApp nao configurado'

  async function saveSettings(shouldTest: boolean) {
    setConnectionFeedback(null)

    const result = await updateWhatsAppSettingsAction(workspace.id, {
      whatsapp_provider: provider,
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_business_account_id: businessAccountId,
      whatsapp_phone: whatsAppPhone,
      whatsapp_token: token,
      twilio_whatsapp_from: twilioFrom,
      twilio_content_sid_new_lead: twilioContentSid,
    })

    if (result.error) {
      setConnectionFeedback({ tone: 'error', message: result.error })
      toast.error(result.error)
      return
    }

    setToken('')
    router.refresh()

    if (shouldTest) {
      const testResult = await testWhatsAppConnectionAction(workspace.id)
      if (testResult.error) {
        setConnectionFeedback({ tone: 'error', message: testResult.error })
        toast.error(testResult.error)
        return
      }

      setConnectionFeedback({
        tone: 'success',
        message:
          provider === 'twilio'
            ? 'Configuracao Twilio validada sem chamada externa.'
            : 'Conexao com a Meta validada com sucesso.',
      })
      toast.success('Conexao com WhatsApp validada com sucesso.')
    } else {
      setConnectionFeedback({
        tone: 'success',
        message: 'Configuracoes salvas. Agora voce ja pode testar a conexao.',
      })
      toast.success('Configuracoes do WhatsApp salvas.')
    }
  }

  async function handleDisconnect() {
    const result = await disconnectWhatsAppAction(workspace.id)
    if (result.error) {
      setConnectionFeedback({ tone: 'error', message: result.error })
      toast.error(result.error)
      return
    }

    setToken('')
    router.refresh()
    setConnectionFeedback(null)
    toast.success('WhatsApp desconectado.')
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <MessageCircle size={24} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{statusTitle}</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure sua conta WhatsApp Business para receber e enviar mensagens pelo CRM.
              </p>
            </div>
          </div>

          {isConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              <CheckCircle2 size={12} />
              Configurado
            </span>
          ) : hasPartialConfig ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Configuracao incompleta
            </span>
          ) : null}
        </div>

        {!hasMinimumConfig ? (
          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">
              {provider === 'twilio'
                ? 'Preencha o sender Twilio para continuar.'
                : 'Preencha Phone Number ID, numero e token para continuar.'}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              O token pode ficar em branco apenas quando este workspace ja tiver um token salvo.
            </p>
          </div>
        ) : null}

        {isConnected ? (
          <div className="mb-6 grid gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-700">Numero configurado</p>
              <p className="mt-1 font-medium">
                {provider === 'twilio' ? workspace.twilio_whatsapp_from : workspace.whatsapp_phone}
              </p>
            </div>
            {provider === 'meta_cloud' ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-green-700">
                  Phone Number ID
                </p>
                <p className="mt-1 font-medium">{workspace.whatsapp_phone_number_id}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Provedor</label>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as 'meta_cloud' | 'twilio')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
            >
              <option value="meta_cloud">Meta Cloud API</option>
              <option value="twilio">Twilio</option>
            </select>
          </div>

          {provider === 'meta_cloud' ? (
            <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number ID</label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(event) => setPhoneNumberId(event.target.value)}
              placeholder="Ex: 123456789012345"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              O Phone Number ID fica no painel WhatsApp do app da Meta.
            </p>
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
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Numero WhatsApp</label>
            <input
              type="text"
              value={whatsAppPhone}
              onChange={(event) => setWhatsAppPhone(event.target.value)}
              placeholder="Ex: +55 82 99999-9999"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
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
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              O token nunca e exibido completo depois de salvo e nao vai para o frontend.
            </p>
          </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Sender Twilio WhatsApp
                </label>
                <input
                  type="text"
                  value={twilioFrom}
                  onChange={(event) => setTwilioFrom(event.target.value)}
                  placeholder="whatsapp:+5582999999999"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Content SID padrao de novo lead
                </label>
                <input
                  type="text"
                  value={twilioContentSid}
                  onChange={(event) => setTwilioContentSid(event.target.value)}
                  placeholder="HX..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-green-400 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-900">
          {provider === 'twilio' ? (
            <>
              <p>As credenciais Twilio ficam somente nas variaveis server-side da Vercel.</p>
              <p className="mt-1">A Inbox nunca exibe API Key Secret, Auth Token ou Account SID.</p>
            </>
          ) : (
            <>
              <p>Use um System User Token permanente em producao.</p>
              <p className="mt-1">Nunca use o token temporario de 24h em producao.</p>
              <p className="mt-1">Depois de salvar, teste a conexao antes de ativar o webhook real.</p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-gray-900">Diagnostico tecnico</h4>
            <span className="text-xs text-gray-500">Segredos nunca sao exibidos aqui.</span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-gray-700">
            <div className="flex items-center justify-between gap-3">
              <span>WHATSAPP_VERIFY_TOKEN</span>
              <span className={diagnostics.hasVerifyToken ? 'text-green-700' : 'text-amber-700'}>
                {diagnostics.hasVerifyToken ? 'Configurado' : 'Ausente'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>WHATSAPP_APP_SECRET</span>
              <span className={diagnostics.hasAppSecret ? 'text-green-700' : 'text-amber-700'}>
                {diagnostics.hasAppSecret ? 'Configurado' : 'Ausente'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{provider === 'twilio' ? 'TWILIO_STATUS_CALLBACK_URL' : 'Phone Number ID'}</span>
              <span className={(provider === 'twilio' || phoneNumberId.trim()) ? 'text-green-700' : 'text-amber-700'}>
                {provider === 'twilio' ? 'Server-side' : phoneNumberId.trim() ? 'Configurado' : 'Ausente'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{provider === 'twilio' ? 'Sender Twilio' : 'Numero WhatsApp'}</span>
              <span className={(provider === 'twilio' ? twilioFrom.trim() : whatsAppPhone.trim()) ? 'text-green-700' : 'text-amber-700'}>
                {(provider === 'twilio' ? twilioFrom.trim() : whatsAppPhone.trim()) ? 'Configurado' : 'Ausente'}
              </span>
            </div>
            {provider === 'meta_cloud' ? (
            <div className="flex items-center justify-between gap-3">
              <span>Token de acesso</span>
              <span
                className={token.trim() || workspace.has_whatsapp_token ? 'text-green-700' : 'text-amber-700'}
              >
                {token.trim() || workspace.has_whatsapp_token ? 'Configurado' : 'Ausente'}
              </span>
            </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
            <p className="font-medium text-gray-800">Webhook sugerido</p>
            <p className="mt-1 break-all">{diagnostics.suggestedWebhookUrl}</p>
            <p className="mt-2">
              Teste o `GET /api/whatsapp/webhook` antes de verificar o endpoint no painel da Meta.
            </p>
          </div>

          {diagnostics.warnings.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900">
              {diagnostics.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          {connectionFeedback ? (
            <div
              className={[
                'mt-3 rounded-xl p-3 text-xs',
                connectionFeedback.tone === 'success'
                  ? 'border border-green-100 bg-green-50 text-green-900'
                  : 'border border-red-100 bg-red-50 text-red-900',
              ].join(' ')}
            >
              <p className="font-medium">Ultimo teste de conexao</p>
              <p className="mt-1">{connectionFeedback.message}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              startSaving(async () => {
                await saveSettings(false)
              })
            }
            disabled={isSaving || isTesting || isDisconnecting || !hasMinimumConfig}
            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar configuracoes'}
          </button>

          <button
            type="button"
            onClick={() =>
              startTesting(async () => {
                await saveSettings(true)
              })
            }
            disabled={isSaving || isTesting || isDisconnecting || !hasMinimumConfig}
            className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
          >
            <PlugZap size={15} />
            {isTesting ? 'Testando...' : 'Salvar e testar conexao'}
          </button>

          {isConnected ? (
            <AlertDialog>
              <AlertDialogTrigger className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                <Unplug size={15} />
                Desconectar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso vai remover o Phone Number ID, o numero configurado e o token salvo deste workspace.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDisconnecting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDisconnecting}
                    onClick={() =>
                      startDisconnecting(async () => {
                        await handleDisconnect()
                      })
                    }
                  >
                    {isDisconnecting ? 'Desconectando...' : 'Confirmar desconexao'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>
            Para validar o envio e o webhook reais, use o numero sandbox da Meta e finalize a
            configuracao em{' '}
            <Link href="/dashboard/settings?tab=whatsapp" className="font-medium text-green-700">
              Configuracoes &gt; WhatsApp
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
