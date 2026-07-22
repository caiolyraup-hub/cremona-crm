'use client'

import Link from 'next/link'
import { BarChart3, UserPlus, DollarSign, CheckSquare } from 'lucide-react'

export function WelcomeState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-lg w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mx-auto mb-4">
          <BarChart3 size={32} className="text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Bem-vindo ao seu painel de operação
        </h2>
        <p className="text-sm text-gray-500 mb-8">
          Seus números aparecerão aqui conforme você registrar vendas,
          adicionar contatos e acompanhar tarefas.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/dashboard/contacts"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <UserPlus size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors font-medium">
              Adicionar contato
            </span>
          </Link>
          <Link
            href="/dashboard/sales"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <DollarSign size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors font-medium">
              Registrar venda
            </span>
          </Link>
          <Link
            href="/dashboard/tasks"
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
          >
            <CheckSquare size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-xs text-gray-600 group-hover:text-blue-600 transition-colors font-medium">
              Criar tarefa
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
