'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { createOnboardingContactsAction } from '@/app/onboarding/actions'

interface Contact {
  id: string
  name: string
  phone: string
  company: string
}

function nextId() {
  return `c-${Math.random().toString(36).slice(2, 8)}`
}

function isValidPhone(phone: string) {
  if (!phone.trim()) return true
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 13
}

interface StepContactsProps {
  onNext: (createdCount: number) => void
  onBack: () => void
}

export function StepContacts({ onNext, onBack }: StepContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([
    { id: nextId(), name: '', phone: '', company: '' },
  ])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  function addRow() {
    setContacts((prev) => [...prev, { id: nextId(), name: '', phone: '', company: '' }])
  }

  function update(id: string, field: keyof Contact, value: string) {
    setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)))
    setErrors((prev) => ({ ...prev, [id]: '' }))
  }

  function remove(id: string) {
    setContacts((prev) => prev.filter((contact) => contact.id !== id))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function handleSkip() {
    onNext(0)
  }

  function handleSave() {
    const validContacts = contacts.filter((contact) => contact.name.trim())
    const nextErrors = Object.fromEntries(
      validContacts
        .filter((contact) => !isValidPhone(contact.phone))
        .map((contact) => [contact.id, 'Informe um telefone valido'])
    )

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    startTransition(async () => {
      if (validContacts.length > 0) {
        await createOnboardingContactsAction(validContacts)
      }

      onNext(validContacts.length)
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Users size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Adicione seus primeiros contatos</h2>
          <p className="text-sm text-gray-500">Opcional - voce pode fazer isso depois</p>
        </div>
      </div>

      <div className="space-y-2">
        {contacts.map((contact) => (
          <div key={contact.id} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white p-2.5">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder="Nome *"
                value={contact.name}
                onChange={(e) => update(contact.id, 'name', e.target.value)}
                className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Telefone"
                  value={contact.phone}
                  onChange={(e) => update(contact.id, 'phone', e.target.value)}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                />
                <input
                  type="text"
                  placeholder="Empresa"
                  value={contact.company}
                  onChange={(e) => update(contact.id, 'company', e.target.value)}
                  className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                />
              </div>
              {errors[contact.id] ? (
                <p className="text-xs text-red-500">{errors[contact.id]}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(contact.id)}
              disabled={contacts.length === 1}
              className="mt-1 text-gray-300 transition-colors hover:text-red-400 disabled:opacity-20"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus size={14} />
        Adicionar contato
      </button>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          Pular
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Continuar'}
        </button>
      </div>
    </div>
  )
}
