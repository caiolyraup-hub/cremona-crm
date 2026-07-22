'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { registerAction } from '../actions'
import { FormInput } from '@/components/ui/form-input'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? 'Criando conta…' : 'Criar conta'}
    </button>
  )
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(registerAction, { error: null })

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1a2b4a]">Cremona</h1>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Criar sua conta grátis</h2>
            <p className="mt-1 text-sm text-muted-foreground">14 dias grátis, sem cartão de crédito</p>
          </div>

          <form action={formAction} className="space-y-4">
            <FormInput
              label="Nome completo"
              name="name"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              required
            />

            <FormInput
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />

            <FormInput
              label="Senha"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              required
            />

            <FormInput
              label="Confirmar senha"
              name="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              required
            />

            {state.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}

            <SubmitButton />
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
