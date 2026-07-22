'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDateForDatabase, parseDateKeyAsLocalDate } from '@/lib/formatters'
import type { CreateTaskInput } from '@/types/app'

function normalizeDueDate(dueDate: string | undefined): string | null {
  if (!dueDate) return null

  const parsedDate = parseDateKeyAsLocalDate(dueDate) ?? new Date(dueDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return formatDateForDatabase(parsedDate)
}

async function requireAuthorizedWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) {
    return { supabase, error: 'Voce nao tem permissao para alterar tarefas neste workspace.' }
  }

  return { supabase, error: null }
}

export async function createTaskAction(
  data: CreateTaskInput,
  workspaceId: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  const title = data.title?.trim() ?? ''
  if (title.length < 2) return { data: null, error: 'Titulo deve ter pelo menos 2 caracteres' }
  if (title.length > 200) return { data: null, error: 'Titulo deve ter no maximo 200 caracteres' }
  if (data.description && data.description.length > 1000) {
    return { data: null, error: 'Descricao deve ter no maximo 1000 caracteres' }
  }

  const { supabase, error: authError } = await requireAuthorizedWorkspace(workspaceId)
  if (authError) return { data: null, error: authError }

  const normalizedDueDate = normalizeDueDate(data.due_date)
  if (data.due_date !== undefined && data.due_date !== '' && !normalizedDueDate) {
    return { data: null, error: 'Informe uma data de prazo valida.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: task, error } = await (supabase as any)
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title,
      priority: data.priority ?? 'medium',
      contact_id: data.contact_id || null,
      due_date: normalizedDueDate,
      description: data.description || null,
    })
    .select('id')
    .single()

  if (error) return { data: null, error: 'Erro ao criar tarefa' }

  if (data.contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activities').insert({
      workspace_id: workspaceId,
      contact_id: data.contact_id,
      type: 'task',
      content: `Tarefa criada: ${title}`,
    })
    revalidatePath(`/dashboard/contacts/${data.contact_id}`)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard', 'layout')
  return { data: task as { id: string }, error: null }
}

export async function updateTaskAction(
  id: string,
  data: Partial<CreateTaskInput>,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedWorkspace(workspaceId)
  if (authError) return { error: authError }

  const { data: existingRows } = await supabase
    .from('tasks')
    .select('id, contact_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .limit(1)

  const existing = (existingRows ?? []) as { id: string; contact_id: string | null }[]
  if (existing.length === 0) return { error: 'Tarefa nao encontrada' }

  const update: Record<string, unknown> = {}

  if (data.title !== undefined) {
    const nextTitle = data.title.trim()
    if (nextTitle.length < 2) return { error: 'Titulo deve ter pelo menos 2 caracteres' }
    update.title = nextTitle
  }

  if (data.priority !== undefined) update.priority = data.priority
  if (data.contact_id !== undefined) update.contact_id = data.contact_id || null

  if (data.due_date !== undefined) {
    const normalizedDueDate = normalizeDueDate(data.due_date)
    if (data.due_date !== '' && !normalizedDueDate) {
      return { error: 'Informe uma data de prazo valida.' }
    }
    update.due_date = normalizedDueDate
  }

  if (data.description !== undefined) update.description = data.description || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tasks')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar tarefa' }

  const previousContactId = existing[0].contact_id
  const nextContactId = data.contact_id !== undefined ? data.contact_id || null : previousContactId
  const contactIds = Array.from(new Set([previousContactId, nextContactId].filter(Boolean)))

  for (const contactId of contactIds) {
    revalidatePath(`/dashboard/contacts/${contactId}`)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function completeTaskAction(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedWorkspace(workspaceId)
  if (authError) return { error: authError }

  const { data: rows } = await supabase
    .from('tasks')
    .select('id, completed_at, contact_id, title')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .limit(1)

  const tasks = (rows ?? []) as {
    id: string
    completed_at: string | null
    contact_id: string | null
    title: string
  }[]

  if (tasks.length === 0) return { error: 'Tarefa nao encontrada' }

  const task = tasks[0]
  const completing = task.completed_at === null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('tasks')
    .update({ completed_at: completing ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao atualizar tarefa' }

  if (completing && task.contact_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('activities').insert({
      workspace_id: workspaceId,
      contact_id: task.contact_id,
      type: 'task',
      content: `Tarefa concluida: ${task.title}`,
    })
  }

  if (task.contact_id) revalidatePath(`/dashboard/contacts/${task.contact_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}

export async function deleteTaskAction(
  id: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { supabase, error: authError } = await requireAuthorizedWorkspace(workspaceId)
  if (authError) return { error: authError }

  const { data: rows } = await supabase
    .from('tasks')
    .select('contact_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .limit(1)

  const contactId = ((rows ?? []) as { contact_id: string | null }[])[0]?.contact_id ?? null

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Erro ao excluir tarefa' }

  if (contactId) revalidatePath(`/dashboard/contacts/${contactId}`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard', 'layout')
  return { error: null }
}
