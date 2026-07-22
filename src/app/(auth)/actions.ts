'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensurePrimaryPipeline } from '@/lib/pipeline-defaults'

type ActionState = { error: string | null }

function generateSlug(email: string): string {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  const suffix = Date.now().toString(36).slice(-4)
  return `${base}-${suffix}`
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Preencha todos os campos' }
  }
  if (!isValidEmail(email)) {
    return { error: 'E-mail inválido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (
      error.message.includes('Invalid login credentials') ||
      error.message.includes('invalid_credentials')
    ) {
      return { error: 'E-mail ou senha incorretos' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Confirme seu e-mail antes de entrar' }
    }
    return { error: 'Erro ao conectar. Tente novamente.' }
  }

  redirect('/dashboard')
}

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'Preencha todos os campos' }
  }
  if (!isValidEmail(email)) {
    return { error: 'E-mail inválido' }
  }
  if (password.length < 8) {
    return { error: 'A senha deve ter pelo menos 8 caracteres' }
  }
  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem' }
  }

  const supabase = await createClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })

  if (signUpError) {
    if (
      signUpError.message.includes('already registered') ||
      signUpError.message.includes('email_exists') ||
      signUpError.message.includes('User already registered')
    ) {
      return { error: 'Este e-mail já está cadastrado' }
    }
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const userId = data.user?.id
  if (!userId) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const admin = createAdminClient()
  const slug = generateSlug(email)
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({
      name: `${name}'s workspace`,
      slug,
      owner_id: userId,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
    })
    .select('id')
    .single()

  if (wsError || !workspace) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const { error: memberError } = await admin.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'owner',
  })

  if (memberError) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const defaultStages = [
    { name: 'Novo lead', position: 1, color: '#94A3B8' },
    { name: 'Em contato', position: 2, color: '#60A5FA' },
    { name: 'Proposta enviada', position: 3, color: '#FBBF24' },
    { name: 'Negociação', position: 4, color: '#F97316' },
    { name: 'Fechado', position: 5, color: '#22C55E' },
  ]

  const ensuredPipeline = await ensurePrimaryPipeline(admin, workspace.id)
  if (ensuredPipeline.error || !ensuredPipeline.pipelineId) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  const { error: stagesError } = await admin
    .from('pipeline_stages')
    .insert(defaultStages.map((s) => ({
      ...s,
      workspace_id: workspace.id,
      pipeline_id: ensuredPipeline.pipelineId,
    })))

  if (stagesError) {
    return { error: 'Erro ao criar conta. Tente novamente.' }
  }

  redirect('/dashboard')
}
