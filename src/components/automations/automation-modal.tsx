'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createAutomationAction, updateAutomationAction } from '@/app/(dashboard)/dashboard/automations/actions'
import { createClient } from '@/lib/supabase/client'
import { uploadOutboundMedia } from '@/lib/whatsapp/media'
import { FileText, Mic, Upload, Video, X } from 'lucide-react'
import type { Automation } from '@/types/app'
import type { Tables } from '@/types/database'

type WaTemplate = Tables<'whatsapp_templates'>

type Stage = Tables<'pipeline_stages'>

export interface AutomationPreset {
  name?: string
  triggerType?: string
  stageId?: string
  actionType?: string
  message?: string
  delayMinutes?: number
}

interface AutomationModalProps {
  mode: 'create' | 'edit'
  automation?: Automation
  workspaceId: string
  stages: Stage[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialValues?: AutomationPreset
}

const DELAY_OPTIONS = [
  { label: 'Imediatamente', value: 0 },
  { label: '5 minutos', value: 5 },
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '24 horas', value: 1440 },
]

const PRIORITY_OPTIONS = [
  { label: 'Alta', value: 'high' },
  { label: 'Média', value: 'medium' },
  { label: 'Baixa', value: 'low' },
]

const VARS = ['{{contact_name}}', '{{contact_phone}}', '{{contact_company}}']

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement | null>, text: string, onChange: (v: string) => void) {
  const el = ref.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const next = el.value.slice(0, start) + text + el.value.slice(end)
  onChange(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + text.length, start + text.length)
  })
}

export function AutomationModal({
  mode, automation, workspaceId, stages, open, onOpenChange, onSuccess, initialValues
}: AutomationModalProps) {
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState('contact_created')
  const [stageId, setStageId] = useState('')
  const [actionType, setActionType] = useState('send_whatsapp_text')
  const [message, setMessage] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDays, setTaskDays] = useState(0)
  const [delayMinutes, setDelayMinutes] = useState(0)
  const [active, setActive] = useState(true)

  const [approvedTemplates, setApprovedTemplates] = useState<WaTemplate[]>([])
  const [templateId, setTemplateId] = useState('')
  const [varDefaults, setVarDefaults] = useState<Record<string, string>>({})
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'document' | 'audio' | 'video' | ''>('')
  const [mediaFilename, setMediaFilename] = useState('')
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('')
  const [mediaCaption, setMediaCaption] = useState('')
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)

  const fetchApprovedTemplates = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createClient() as any)
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'approved')
      .order('display_name', { ascending: true })
    setApprovedTemplates(data ?? [])
  }, [workspaceId])

  useEffect(() => {
    if (open && (actionType === 'send_whatsapp_template' || (mode === 'edit' && automation?.action_type === 'send_whatsapp_template'))) {
      void fetchApprovedTemplates()
    }
  }, [open, actionType, mode, automation?.action_type, fetchApprovedTemplates])

  const selectedTemplate = approvedTemplates.find(t => t.id === templateId)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && automation) {
      setName(automation.name)
      setTriggerType(automation.trigger_type)
      setStageId(automation.trigger_config.stage_id ?? '')
      setActionType(automation.action_type)
      setMessage(automation.action_config.message ?? '')
      setTaskTitle(automation.action_config.title ?? '')
      setTaskPriority(automation.action_config.priority ?? 'medium')
      setTaskDays(Number(automation.action_config.days_offset ?? 0))
      setDelayMinutes(automation.delay_minutes)
      setActive(automation.active)
      setTemplateId(automation.action_config.template_id ?? '')
      setMediaUrl(automation.action_config.media_url ?? '')
      setMediaType((automation.action_config.media_type as 'image' | 'document' | 'audio' | 'video') ?? '')
      setMediaFilename(automation.action_config.filename ?? '')
      setMediaPreviewUrl(automation.action_config.media_url ?? '')
      setMediaCaption(automation.action_config.caption ?? '')
      try {
        setVarDefaults(JSON.parse(automation.action_config.variable_defaults ?? '{}'))
      } catch { setVarDefaults({}) }
    } else {
      setName(initialValues?.name ?? '')
      setTriggerType(initialValues?.triggerType ?? 'contact_created')
      setStageId(initialValues?.stageId ?? '')
      setActionType(initialValues?.actionType ?? 'send_whatsapp_text')
      setMessage(initialValues?.message ?? '')
      setTaskTitle('')
      setTaskPriority('medium')
      setTaskDays(0)
      setDelayMinutes(initialValues?.delayMinutes ?? 0)
      setActive(true)
      setTemplateId('')
      setVarDefaults({})
      setMediaUrl('')
      setMediaType('')
      setMediaFilename('')
      setMediaPreviewUrl('')
      setMediaCaption('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, automation])

  function buildPayload() {
    const trigger_config: Record<string, string> =
      (triggerType === 'stage_enter' || triggerType === 'stage_exit') && stageId
        ? { stage_id: stageId }
        : {}

    let action_config: Record<string, string> = {}
    if (actionType === 'send_whatsapp_text') {
      action_config = { message }
    } else if (actionType === 'create_task') {
      action_config = { title: taskTitle, priority: taskPriority, days_offset: String(taskDays) }
    } else if (actionType === 'send_whatsapp_template') {
      action_config = { template_id: templateId, variable_defaults: JSON.stringify(varDefaults) }
    } else if (actionType === 'send_whatsapp_media') {
      action_config = {
        media_url: mediaUrl,
        media_type: mediaType,
        filename: mediaFilename,
        caption: mediaCaption,
      }
    }

    return { name, trigger_type: triggerType, trigger_config, action_type: actionType, action_config, delay_minutes: delayMinutes, active }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = buildPayload()
    startTransition(async () => {
      const result = mode === 'create'
        ? await createAutomationAction(payload, workspaceId)
        : await updateAutomationAction(automation!.id, payload, workspaceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(mode === 'create' ? 'Automação criada' : 'Automação atualizada')
        if (result.warning) toast.warning(result.warning)
        onOpenChange(false)
        onSuccess?.()
      }
    })
  }

  async function handleMediaFile(file: File | undefined) {
    if (!file) return
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo deve ter no maximo 16MB.')
      return
    }

    setIsUploadingMedia(true)
    setMediaPreviewUrl(URL.createObjectURL(file))
    setMediaFilename(file.name)

    const result = await uploadOutboundMedia({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: createClient() as any,
      workspaceId,
      file,
    })

    setIsUploadingMedia(false)

    if (result.error || !result.url) {
      toast.error(result.error ?? 'Nao foi possivel enviar o arquivo.')
      setMediaUrl('')
      return
    }

    setMediaUrl(result.url)
    setMediaType(result.mediaType)
    setMediaFilename(result.filename)
  }

  function clearMedia() {
    setMediaUrl('')
    setMediaType('')
    setMediaFilename('')
    setMediaPreviewUrl('')
    setMediaCaption('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const needsStage = triggerType === 'stage_enter' || triggerType === 'stage_exit'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova automação' : 'Editar automação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* GATILHO */}
          <div className="rounded-r-lg border-l-4 border-blue-400 bg-blue-50 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Quando isso acontecer…</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Evento</label>
              <select
                value={triggerType}
                onChange={e => setTriggerType(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="contact_created">👤  Novo contato criado</option>
                <option value="stage_enter">⚡  Lead entra em uma etapa</option>
                <option value="stage_exit">🚪  Lead sai de uma etapa</option>
              </select>
            </div>

            {needsStage && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Etapa</label>
                <select
                  value={stageId}
                  onChange={e => setStageId(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Selecionar etapa…</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* AÇÃO */}
          <div className="rounded-r-lg border-l-4 border-green-400 bg-green-50 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Fazer isso automaticamente…</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Ação</label>
              <select
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
              >
                <option value="send_whatsapp_text">💬  Enviar mensagem WhatsApp</option>
                <option value="send_whatsapp_template">📋  Enviar template WhatsApp</option>
                <option value="send_whatsapp_media">Enviar midia (imagem/documento)</option>
                <option value="create_task">✅  Criar tarefa no CRM</option>
              </select>
            </div>

            {actionType === 'send_whatsapp_text' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700">Mensagem</label>
                  <span className="text-[11px] text-gray-400">{message.length} / 1024</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={1024}
                  rows={4}
                  placeholder={`Olá {{contact_name}}, tudo bem?…`}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                  required
                />
                <div className="rounded-md bg-white border border-gray-100 p-2 space-y-1">
                  <p className="text-[11px] text-gray-500">Variáveis disponíveis (clique para inserir):</p>
                  <div className="flex flex-wrap gap-1">
                    {VARS.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertAtCursor(textareaRef, v, setMessage)}
                        className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {actionType === 'send_whatsapp_media' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,audio/*,video/*"
                  className="hidden"
                  onChange={e => void handleMediaFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center transition-colors hover:border-green-300 hover:bg-green-50/40"
                >
                  {!mediaUrl && !mediaFilename ? (
                    <span className="flex flex-col items-center gap-1">
                      <Upload size={24} className="text-gray-300" />
                      <span className="text-sm font-medium text-gray-700">Clique para selecionar arquivo</span>
                      <span className="text-xs text-gray-400">Imagens, PDFs, audios ate 16MB</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-3">
                      {mediaType === 'image' && mediaPreviewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaPreviewUrl} alt="" className="h-20 w-20 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                          {mediaType === 'audio' ? <Mic size={20} /> : mediaType === 'video' ? <Video size={20} /> : <FileText size={20} />}
                        </span>
                      )}
                      <span className="min-w-0 text-left">
                        <span className="block truncate text-sm font-medium text-gray-800">{mediaFilename}</span>
                        <span className="block text-xs text-gray-400">{mediaType || 'Enviando...'}</span>
                      </span>
                    </span>
                  )}
                </button>

                {isUploadingMedia && (
                  <div className="h-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-green-500" />
                  </div>
                )}

                {mediaFilename && (
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600"
                  >
                    <X size={13} />
                    Remover e trocar arquivo
                  </button>
                )}

                {mediaType && mediaType !== 'audio' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={mediaCaption}
                      onChange={e => setMediaCaption(e.target.value)}
                      placeholder="Adicionar mensagem..."
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {['{{contact_name}}', '{{contact_company}}'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMediaCaption(prev => `${prev}${prev ? ' ' : ''}${v}`)}
                          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 hover:bg-blue-100 hover:text-blue-700"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  O arquivo e enviado pela URL publica do Supabase Storage. Certifique-se de que o bucket &apos;outbound-media&apos; e publico.
                </div>
              </div>
            )}

            {actionType === 'send_whatsapp_template' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Template</label>
                  {approvedTemplates.length === 0 ? (
                    <p className="text-xs text-gray-500">Nenhum template aprovado. Acesse <span className="font-medium">Configurações → Templates</span> para criar e aprovar um.</p>
                  ) : (
                    <select
                      value={templateId}
                      onChange={e => { setTemplateId(e.target.value); setVarDefaults({}) }}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                      required
                    >
                      <option value="">Selecionar template…</option>
                      {approvedTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.display_name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedTemplate && (
                  <>
                    {(selectedTemplate.variables as Array<{ index: number; label: string; default: string }> ?? []).length > 0 && (
                      <div className="space-y-2 rounded-lg bg-white border border-gray-100 p-2.5">
                        <p className="text-[11px] font-medium text-gray-500">Valores padrão das variáveis</p>
                        {(selectedTemplate.variables as Array<{ index: number; label: string; default: string }> ?? []).map(v => (
                          <div key={v.index} className="space-y-1">
                            <label className="text-[11px] text-gray-500">
                              {`{{${v.index}}}`}{v.label ? ` — ${v.label}` : ''}
                            </label>
                            <input
                              type="text"
                              value={varDefaults[String(v.index)] ?? v.default ?? ''}
                              onChange={e => setVarDefaults(prev => ({ ...prev, [String(v.index)]: e.target.value }))}
                              placeholder={v.default || `Valor para {{${v.index}}}`}
                              className="w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs focus:outline-none"
                            />
                            <div className="flex flex-wrap gap-1">
                              {VARS.map(cv => (
                                <button key={cv} type="button"
                                  onClick={() => setVarDefaults(prev => ({ ...prev, [String(v.index)]: cv }))}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600 hover:bg-blue-100 hover:text-blue-700">
                                  {cv}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="rounded-lg bg-white border border-gray-100 px-2.5 py-2">
                      <p className="mb-1 text-[11px] font-medium text-gray-400">Prévia do template:</p>
                      <p className="whitespace-pre-wrap text-xs italic text-gray-600">
                        {(selectedTemplate.body_text as string).replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => {
                          const val = varDefaults[n] ?? (selectedTemplate.variables as Array<{ index: number; default: string }> ?? []).find(v => v.index === Number(n))?.default ?? `{{${n}}}`
                          return val ? `[${val}]` : `{{${n}}}`
                        })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {actionType === 'create_task' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Título da tarefa</label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    placeholder="Follow-up com {{contact_name}}"
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Prioridade</label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    >
                      {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">Prazo (dias)</label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={taskDays}
                      onChange={e => setTaskDays(Number(e.target.value))}
                      placeholder="0 = hoje, 1 = amanhã"
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CONFIGURAÇÕES */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Configurações</p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Nome para identificar</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                placeholder="Ex: Boas-vindas ao lead novo"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Aguardar antes de executar</label>
              <select
                value={delayMinutes}
                onChange={e => setDelayMinutes(Number(e.target.value))}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none"
              >
                {DELAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActive(v => !v)}
                className={[
                  'relative h-5 w-9 rounded-full transition-colors',
                  active ? 'bg-blue-600' : 'bg-gray-200',
                ].join(' ')}
              >
                <span className={[
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  active ? 'translate-x-4' : 'translate-x-0.5',
                ].join(' ')} />
              </button>
              <span className="text-sm text-gray-700">Automação ativa</span>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isPending ? 'Salvando…' : 'Salvar automação'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
