/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const VALID_TRIGGER_TYPES = ['stage_enter', 'stage_exit', 'contact_created', 'task_overdue']
const VALID_ACTION_TYPES = ['send_whatsapp_text', 'send_whatsapp_template', 'send_whatsapp_media', 'create_task']
const VALID_MEDIA_TYPES = ['image', 'document', 'audio', 'video']

async function requireMember(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  return { supabase, isMember: !!member }
}

interface AutomationInput {
  name: string
  trigger_type: string
  trigger_config: Record<string, string>
  action_type: string
  action_config: Record<string, string>
  delay_minutes: number
  active: boolean
}

function validateInput(data: AutomationInput): string | null {
  const name = data.name?.trim() ?? ''
  if (name.length < 2) return 'Nome deve ter pelo menos 2 caracteres'
  if (name.length > 100) return 'Nome deve ter no maximo 100 caracteres'

  if (!VALID_TRIGGER_TYPES.includes(data.trigger_type)) return 'Gatilho invalido'
  if (!VALID_ACTION_TYPES.includes(data.action_type)) return 'Acao invalida'

  if ((data.trigger_type === 'stage_enter' || data.trigger_type === 'stage_exit') &&
      !data.trigger_config?.stage_id) {
    return 'Selecione uma etapa para o gatilho'
  }

  if (data.action_type === 'send_whatsapp_text') {
    const msg = data.action_config?.message?.trim() ?? ''
    if (!msg) return 'Digite a mensagem a ser enviada'
    if (msg.length < 5) return 'A mensagem deve ter pelo menos 5 caracteres'
    if (msg.length > 1024) return 'Mensagem deve ter no maximo 1024 caracteres'
  }

  if (data.action_type === 'send_whatsapp_media') {
    if (!data.action_config?.media_url?.trim()) return 'Selecione um arquivo de midia'
    if (!VALID_MEDIA_TYPES.includes(data.action_config?.media_type)) return 'Tipo de midia invalido'
  }

  if (data.action_type === 'send_whatsapp_template' && !data.action_config?.template_id?.trim()) {
    return 'Selecione um template aprovado'
  }

  if (data.action_type === 'create_task') {
    if (!data.action_config?.title?.trim()) return 'Digite o titulo da tarefa'
  }

  return null
}

export async function createAutomationAction(
  data: AutomationInput,
  workspaceId: string
): Promise<{ error: string | null; warning?: string }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissao' }

  const validationError = validateInput(data)
  if (validationError) return { error: validationError }

  const advancedValidation = await validateWorkspaceAutomationConfig(supabase, data, workspaceId)
  if (advancedValidation.error) return { error: advancedValidation.error }

  const { error } = await (supabase as any).from('automations').insert({
    workspace_id: workspaceId,
    name: data.name.trim(),
    trigger_type: data.trigger_type,
    trigger_config: data.trigger_config,
    action_type: data.action_type,
    action_config: data.action_config,
    delay_minutes: data.delay_minutes,
    active: data.active,
  })

  if (error) return { error: 'Erro ao criar automacao. Tente novamente.' }

  revalidatePath('/dashboard/automations')
  return { error: null, warning: advancedValidation.warning }
}

export async function updateAutomationAction(
  id: string,
  data: Partial<AutomationInput>,
  workspaceId: string
): Promise<{ error: string | null; warning?: string }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissao' }

  if (data.name !== undefined || data.trigger_type !== undefined || data.action_type !== undefined) {
    const validationError = validateInput(data as AutomationInput)
    if (validationError) return { error: validationError }
  }

  const advancedValidation = data.action_type
    ? await validateWorkspaceAutomationConfig(supabase, data as AutomationInput, workspaceId)
    : { error: null as string | null, warning: undefined as string | undefined }
  if (advancedValidation.error) return { error: advancedValidation.error }

  const { error } = await (supabase as any)
    .from('automations')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar automacao.' }

  revalidatePath('/dashboard/automations')
  return { error: null, warning: advancedValidation.warning }
}

async function validateWorkspaceAutomationConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: AutomationInput,
  workspaceId: string
): Promise<{ error: string | null; warning?: string }> {
  if (data.action_type === 'send_whatsapp_template') {
    const { data: template } = await (supabase as any)
      .from('whatsapp_templates')
      .select('id, status')
      .eq('id', data.action_config.template_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!template) return { error: 'Template nao encontrado neste workspace.' }
    if (template.status !== 'approved') {
      return {
        error:
          'Este template ainda nao foi aprovado pela Meta. Marque como aprovado em Configuracoes -> Templates antes de usar em automacoes.',
      }
    }
  }

  if (data.action_type.startsWith('send_whatsapp_')) {
    const { data: workspace } = await (supabase as any)
      .from('workspaces')
      .select('whatsapp_phone_number_id')
      .eq('id', workspaceId)
      .maybeSingle()

    if (!workspace?.whatsapp_phone_number_id) {
      return {
        error: null,
        warning:
          'WhatsApp nao configurado. Configure em Configuracoes -> WhatsApp para que as automacoes funcionem.',
      }
    }
  }

  return { error: null }
}

export async function toggleAutomationAction(
  id: string,
  active: boolean,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissao' }

  const { error } = await (supabase as any)
    .from('automations')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar automacao.' }

  revalidatePath('/dashboard/automations')
  return { error: null }
}

export async function deleteAutomationAction(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissao' }

  const { error } = await (supabase as any)
    .from('automations')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir automacao.' }

  revalidatePath('/dashboard/automations')
  return { error: null }
}
