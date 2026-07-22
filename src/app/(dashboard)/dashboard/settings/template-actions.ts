/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { TemplateVariable } from '@/types/app'

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

function parseBodyVariables(bodyText: string): number[] {
  const matches = bodyText.matchAll(/\{\{(\d+)\}\}/g)
  return Array.from(new Set(Array.from(matches).map(m => Number(m[1])))).sort((a, b) => a - b)
}

interface TemplateInput {
  name: string
  display_name: string
  language: string
  category: string
  body_text: string
  variables: TemplateVariable[]
}

function validateInput(data: TemplateInput): string | null {
  const name = data.name?.trim() ?? ''
  if (!name) return 'Nome exato na Meta é obrigatório'
  if (!/^[a-z0-9_]+$/.test(name)) return 'Nome deve conter apenas letras minúsculas, números e underscore'
  if (name.length > 64) return 'Nome deve ter no máximo 64 caracteres'

  if (!data.display_name?.trim()) return 'Nome de exibição é obrigatório'
  if (data.display_name.trim().length > 100) return 'Nome de exibição deve ter no máximo 100 caracteres'

  const body = data.body_text?.trim() ?? ''
  if (!body) return 'Texto do template é obrigatório'
  if (body.length > 1024) return 'Texto deve ter no máximo 1024 caracteres'

  const bodyVars = parseBodyVariables(body)
  const declaredVars = (data.variables ?? []).map(v => v.index)
  const missing = bodyVars.filter(n => !declaredVars.includes(n))
  if (missing.length > 0) {
    return `Variáveis ${missing.map(n => `{{${n}}}`).join(', ')} estão no texto mas não declaradas`
  }

  return null
}

export async function createTemplateAction(
  data: TemplateInput,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissão' }

  const validationError = validateInput(data)
  if (validationError) return { error: validationError }

  const { error } = await (supabase as any).from('whatsapp_templates').insert({
    workspace_id: workspaceId,
    name: data.name.trim(),
    display_name: data.display_name.trim(),
    language: data.language,
    category: data.category,
    body_text: data.body_text.trim(),
    variables: data.variables,
    status: 'pending',
  })

  if (error) return { error: 'Erro ao criar template. Tente novamente.' }

  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function updateTemplateAction(
  id: string,
  data: Partial<TemplateInput>,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissão' }

  if (data.body_text || data.name || data.display_name) {
    const validationError = validateInput(data as TemplateInput)
    if (validationError) return { error: validationError }
  }

  const { error } = await (supabase as any)
    .from('whatsapp_templates')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar template.' }

  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function updateTemplateStatusAction(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissão' }

  const { error } = await (supabase as any)
    .from('whatsapp_templates')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar status.' }

  revalidatePath('/dashboard/settings')
  return { error: null }
}

export async function syncTemplateStatusAction(
  templateId: string,
  workspaceId: string
): Promise<{ newStatus: string | null; error: string | null }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { newStatus: null, error: 'Sem permissão' }

  const { data: tpl } = await (supabase as any)
    .from('whatsapp_templates')
    .select('name')
    .eq('id', templateId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!tpl) return { newStatus: null, error: 'Template não encontrado' }

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('whatsapp_business_account_id, whatsapp_token')
    .eq('id', workspaceId)
    .maybeSingle()

  const wabaId = ws?.whatsapp_business_account_id
  const token = ws?.whatsapp_token

  if (!wabaId || !token) {
    return { newStatus: null, error: 'WhatsApp não configurado. Configure o WABA ID e o token nas Configurações → WhatsApp.' }
  }

  let metaStatus: string | null = null
  try {
    const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?name=${encodeURIComponent(tpl.name)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json() as { data?: Array<{ status: string }> }
    const found = json.data?.[0]
    if (!found) {
      return { newStatus: null, error: 'Template não encontrado na Meta. Verifique se foi criado com o nome exato.' }
    }
    metaStatus = found.status
  } catch {
    return { newStatus: null, error: 'Erro ao consultar a Meta API. Tente novamente.' }
  }

  const newStatus = metaStatus === 'APPROVED'
    ? 'approved'
    : metaStatus === 'REJECTED'
      ? 'rejected'
      : null

  if (newStatus) {
    await (supabase as any)
      .from('whatsapp_templates')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)
    revalidatePath('/dashboard/settings')
  }

  return { newStatus: newStatus ?? 'pending', error: null }
}

export async function deleteTemplateAction(
  id: string,
  workspaceId: string
): Promise<{ error: string | null; blockingAutomations?: string[] }> {
  const { supabase, isMember } = await requireMember(workspaceId)
  if (!isMember) return { error: 'Sem permissão' }

  // Verificar se alguma automação usa este template
  const { data: automations } = await (supabase as any)
    .from('automations')
    .select('name, action_config')
    .eq('workspace_id', workspaceId)
    .eq('action_type', 'send_whatsapp_template')

  const blocking: string[] = ((automations ?? []) as Array<{ name: string; action_config: Record<string, string> }>)
    .filter(a => a.action_config?.template_id === id)
    .map(a => a.name)

  if (blocking.length > 0) {
    return {
      error: `Este template é usado pelas automações: ${blocking.join(', ')}. Remova ou edite essas automações primeiro.`,
      blockingAutomations: blocking,
    }
  }

  const { error } = await (supabase as any)
    .from('whatsapp_templates')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir template.' }

  revalidatePath('/dashboard/settings')
  return { error: null }
}
