/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckSquare, DollarSign, ExternalLink, Mail, Phone, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { completeTaskAction } from '@/app/(dashboard)/dashboard/tasks/actions'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { Skeleton } from '@/components/ui/skeleton'

interface Task {
  id: string
  title: string
  due_date: string | null
  completed_at: string | null
}

interface Sale {
  id: string
  product_name: string
  value: number
  status: string
}

interface ContactData {
  id: string
  name: string
  phone: string | null
  email: string | null
  company: string | null
  tags: string[]
  pipeline_stage: { name: string; color: string } | null
}

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  cancelled: 'Cancelado',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
      ))}
    </div>
  )
}

interface ContactPanelProps {
  contactId: string
  workspaceId: string
  onClose: () => void
}

export function ContactPanel({ contactId, workspaceId, onClose }: ContactPanelProps) {
  const [contact, setContact] = useState<ContactData | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let active = true
    setIsLoading(true)

    async function load() {
      const [contactRes, tasksRes, salesRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, name, phone, email, company, tags, pipeline_stage:pipeline_stages(name, color)')
          .eq('workspace_id', workspaceId)
          .eq('id', contactId)
          .is('deleted_at', null)
          .maybeSingle(),
        supabase
          .from('tasks')
          .select('id, title, due_date, completed_at')
          .eq('workspace_id', workspaceId)
          .eq('contact_id', contactId)
          .is('completed_at', null)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(3),
        supabase
          .from('sales')
          .select('id, product_name, value, status')
          .eq('workspace_id', workspaceId)
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      if (!active) return

      if (contactRes.data) {
        const raw = contactRes.data as any
        setContact({
          id: raw.id,
          name: raw.name,
          phone: raw.phone,
          email: raw.email,
          company: raw.company,
          tags: raw.tags ?? [],
          pipeline_stage: raw.pipeline_stage ?? null,
        })
      }
      setTasks((tasksRes.data ?? []) as Task[])
      setSales((salesRes.data ?? []) as Sale[])
      setIsLoading(false)
    }

    void load()
    return () => { active = false }
  }, [contactId, workspaceId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCompleteTask(taskId: string) {
    const result = await completeTaskAction(workspaceId, taskId)
    if (result?.error) {
      toast.error(result.error)
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    }
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.value ?? 0), 0)

  return (
    <motion.div
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="flex h-full w-[280px] shrink-0 flex-col overflow-y-auto border-l border-gray-200 bg-white"
    >
      {isLoading ? (
        <PanelSkeleton />
      ) : !contact ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-400">Contato não encontrado</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <ContactAvatar name={contact.name} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                {contact.company ? (
                  <p className="truncate text-xs text-gray-500">{contact.company}</p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          <Link
            href={`/dashboard/contacts/${contact.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 border-b border-gray-100 px-4 py-2 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <ExternalLink size={12} />
            Ver perfil completo
          </Link>

          {/* Contato */}
          <div className="border-b border-gray-100 px-4 py-3 space-y-2">
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
              >
                <Phone size={13} className="text-gray-400" />
                {contact.phone}
              </a>
            ) : null}
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
              >
                <Mail size={13} className="text-gray-400" />
                {contact.email}
              </a>
            ) : null}
          </div>

          {/* Pipeline */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pipeline</p>
            {contact.pipeline_stage ? (
              <span
                className="inline-block rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: contact.pipeline_stage.color || '#6b7280' }}
              >
                {contact.pipeline_stage.name}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Sem estágio</span>
            )}
          </div>

          {/* Etiquetas */}
          {contact.tags.length > 0 ? (
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Etiquetas</p>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Tarefas abertas */}
          {tasks.length > 0 ? (
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Tarefas</p>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCompleteTask(task.id)}
                      className="mt-0.5 shrink-0 text-gray-300 hover:text-green-500"
                    >
                      <CheckSquare size={14} />
                    </button>
                    <div className="min-w-0">
                      <Link
                        href="/dashboard/tasks"
                        className="block truncate text-xs text-gray-700 hover:text-blue-600"
                      >
                        {task.title}
                      </Link>
                      {task.due_date ? (
                        <p className="text-[11px] text-gray-400">
                          {format(new Date(task.due_date), "d MMM", { locale: ptBR })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Vendas recentes */}
          {sales.length > 0 ? (
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Vendas</p>
                  <DollarSign size={11} className="text-gray-400" />
                </div>
                <span className="text-xs font-medium text-gray-700">{formatCurrency(totalSales)}</span>
              </div>
              <div className="space-y-2">
                {sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-gray-700">{sale.product_name}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-700">
                        {formatCurrency(Number(sale.value))}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[sale.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {STATUS_LABELS[sale.status] ?? sale.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  )
}
