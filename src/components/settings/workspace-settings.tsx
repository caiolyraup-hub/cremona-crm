'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'
import { updateWorkspaceSettingsAction, uploadLogoAction } from '@/app/(dashboard)/dashboard/settings/actions'
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

const BUSINESS_TYPES = [
  'Agencia',
  'Consultoria',
  'E-commerce',
  'Escola / Curso',
  'Imobiliaria',
  'Saude',
  'Servicos',
  'Tecnologia',
  'Outro',
]

interface WorkspaceSettingsProps {
  workspace: {
    id: string
    name: string
    business_name: string | null
    business_type: string | null
    logo_url: string | null
  }
}

export function WorkspaceSettings({ workspace }: WorkspaceSettingsProps) {
  const router = useRouter()
  const [businessName, setBusinessName] = useState(workspace.business_name ?? workspace.name)
  const [businessType, setBusinessType] = useState(workspace.business_type ?? '')
  const [logoUrl, setLogoUrl] = useState(workspace.logo_url)
  const [isPending, startTransition] = useTransition()
  const [isUploadPending, startUploadTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('business_name', businessName)
    fd.append('business_type', businessType)

    startTransition(async () => {
      const result = await updateWorkspaceSettingsAction(workspace.id, fd)
      if (result?.error) {
        toast.error(result.error)
      } else {
        router.refresh()
        toast.success('Configuracoes salvas')
      }
    })
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('logo', file)

    startUploadTransition(async () => {
      const result = await uploadLogoAction(workspace.id, fd)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setLogoUrl(result.logoUrl ?? null)
        router.refresh()
        toast.success('Logo atualizado')
      }
    })
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-gray-900">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
            {logoUrl ? (
              <Image src={logoUrl} alt="Logo" width={64} height={64} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-gray-300">
                {businessName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadPending}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={14} />
              {isUploadPending ? 'Enviando...' : 'Alterar logo'}
            </button>
            <p className="mt-1 text-xs text-gray-400">PNG, JPG ate 2MB</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nome do negocio</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de negocio</label>
          <div className="flex flex-wrap gap-2">
            {BUSINESS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBusinessType(type)}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors"
                style={{
                  borderColor: businessType === type ? '#378ADD' : '#e5e7eb',
                  backgroundColor: businessType === type ? '#eff6ff' : '#fff',
                  color: businessType === type ? '#378ADD' : '#374151',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || !businessName.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar alteracoes'}
        </button>
      </form>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-900">Zona de perigo</p>
        <p className="mt-1 text-xs text-red-700">
          A exclusao do workspace ainda nao faz parte do MVP e deve ser tratada com cuidado.
        </p>

        <AlertDialog>
          <AlertDialogTrigger className="mt-4 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">
            Excluir workspace
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acao nao sera liberada antes da Semana 03. Mantive o AlertDialog no lugar para o fluxo final de exclusao.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast.success('Exclusao indisponivel no MVP atual')}>
                Entendi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
