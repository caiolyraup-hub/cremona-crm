'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { MoreHorizontal, Users, Tag } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatPhone,
  formatRelativeDate,
  getTagColor,
} from '@/lib/formatters'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import {
  deleteContactAction,
  bulkAddTagAction,
} from '@/app/(dashboard)/dashboard/contacts/actions'
import type { ContactWithStage } from '@/types/app'

interface ContactsTableProps {
  contacts: ContactWithStage[]
  isLoading: boolean
  workspaceId: string
  availableTags: string[]
  onContactClick: (id: string) => void
  onContactDeleted?: () => void
  onBulkChange?: () => void
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      <td className="w-10 px-3 py-3">
        <div className="h-4 w-4 rounded bg-gray-100 animate-pulse" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><div className="h-3 w-28 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 rounded-full bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 rounded-md bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-3 w-20 rounded bg-gray-100 animate-pulse" /></td>
      <td className="px-4 py-3"><div className="h-4 w-4 rounded bg-gray-100 animate-pulse" /></td>
    </tr>
  )
}

function TagPills({ tags }: { tags: string[] }) {
  const visible = tags.slice(0, 2)
  const overflow = tags.length - 2
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(tag => (
        <span
          key={tag}
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: getTagColor(tag) + '20', color: getTagColor(tag) }}
        >
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          +{overflow}
        </span>
      )}
    </div>
  )
}

function ActionMenu({
  contactId,
  contactName,
  workspaceId,
  onView,
  onDeleted,
}: {
  contactId: string
  contactName: string
  workspaceId: string
  onView: () => void
  onDeleted?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteContactAction(contactId, workspaceId)
      if (result.error) toast.error(result.error)
      else { toast.success('Contato excluído'); onDeleted?.() }
    })
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={e => { e.stopPropagation(); setOpen(prev => !prev) }}
          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <MoreHorizontal size={15} />
        </button>
        {open && (
          <div className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
            {[
              { label: 'Ver detalhes', action: () => { onView(); setOpen(false) } },
              { label: 'Editar', action: () => { onView(); setOpen(false) } },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={e => { e.stopPropagation(); action() }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                {label}
              </button>
            ))}
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); setConfirmDelete(true) }}
              className="w-full border-t border-gray-100 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{contactName}</strong> será removido permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleDelete() }}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function BulkTagButton({
  selectedIds,
  workspaceId,
  availableTags,
  onSuccess,
}: {
  selectedIds: Set<string>
  workspaceId: string
  availableTags: string[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  function handleAddTag(tag: string) {
    setOpen(false)
    startTransition(async () => {
      const result = await bulkAddTagAction(Array.from(selectedIds), tag, workspaceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Etiqueta adicionada a ${result.updated} contato${result.updated !== 1 ? 's' : ''}`)
        onSuccess()
      }
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-[#378ADD] transition-colors hover:bg-blue-50 disabled:opacity-40"
      >
        <Tag size={12} />
        Adicionar etiqueta
      </button>
      {open && availableTags.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-md">
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleAddTag(tag)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getTagColor(tag) }}
              />
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ContactsTable({
  contacts,
  isLoading,
  workspaceId,
  availableTags,
  onContactClick,
  onContactDeleted,
  onBulkChange,
}: ContactsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  // Clear selection when contacts list changes (page turn, refetch)
  useEffect(() => {
    setSelectedIds(new Set())
  }, [contacts])

  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected
    }
  }, [someSelected])

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const COLS = ['', 'Contato', 'Telefone', 'Empresa', 'Etiquetas', 'Estágio', 'Criado em', '']

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 border-b border-[#378ADD]/20 bg-blue-50 px-4 py-2.5">
          <span className="text-sm font-medium text-[#378ADD]">
            {selectedIds.size} {selectedIds.size === 1 ? 'contato selecionado' : 'contatos selecionados'}
          </span>
          <div className="h-4 w-px bg-blue-200" />
          <BulkTagButton
            selectedIds={selectedIds}
            workspaceId={workspaceId}
            availableTags={availableTags}
            onSuccess={() => { setSelectedIds(new Set()); onBulkChange?.() }}
          />
          <div className="ml-auto">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="w-10 px-3 py-2.5" onClick={e => e.stopPropagation()}>
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#378ADD]"
              />
            </th>
            {COLS.slice(1).map(col => (
              <th
                key={col}
                className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : contacts.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <EmptyState
                  icon={Users}
                  title="Nenhum contato encontrado"
                  description="Tente ajustar os filtros ou adicione seu primeiro contato"
                />
              </td>
            </tr>
          ) : (
            contacts.map(contact => {
              const isSelected = selectedIds.has(contact.id)
              return (
                <tr
                  key={contact.id}
                  onClick={() => onContactClick(contact.id)}
                  className={`cursor-pointer border-b border-gray-100 transition-colors last:border-0 ${
                    isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="w-10 px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(contact.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#378ADD]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ContactAvatar name={contact.name} size="md" />
                      <div>
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        {contact.email && <p className="text-xs text-gray-400">{contact.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {contact.phone ? formatPhone(contact.phone) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="max-w-[160px] px-4 py-3">
                    {contact.company ? (
                      <span className="block truncate text-gray-600">{contact.company}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.tags?.length > 0 ? <TagPills tags={contact.tags} /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {contact.pipeline_stage ? (
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: contact.pipeline_stage.color + '20',
                          color: contact.pipeline_stage.color,
                        }}
                      >
                        {contact.pipeline_stage.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatRelativeDate(contact.created_at)}</td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      contactId={contact.id}
                      contactName={contact.name}
                      workspaceId={workspaceId}
                      onView={() => onContactClick(contact.id)}
                      onDeleted={onContactDeleted}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
