'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  FileText,
  MoreVertical,
  PencilLine,
  Trash2,
  Zap,
} from 'lucide-react'
import { ContactAvatar } from '@/components/ui/contact-avatar'
import { formatCurrency } from '@/lib/formatters'
import {
  formatSalesListDate,
  formatSalesRelativeDate,
  SALES_PAYMENT_METHOD_LABELS,
  SALES_STATUS_LABELS,
} from '@/lib/sales'
import type { SaleStatus, SaleWithContact } from '@/types/app'

interface SalesListRowProps {
  sale: SaleWithContact
  onEdit: (sale: SaleWithContact) => void
  onDelete: (id: string) => void
  onStatusChange: (sale: SaleWithContact, status: SaleStatus) => void
}

const PAYMENT_METHOD_ICONS = {
  pix: Zap,
  card: CreditCard,
  boleto: FileText,
  cash: Banknote,
  transfer: ArrowLeftRight,
} as const

const STATUS_BADGES = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
} as const

export function SalesListRow({
  sale,
  onEdit,
  onDelete,
  onStatusChange,
}: SalesListRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const PaymentIcon = PAYMENT_METHOD_ICONS[sale.payment_method as keyof typeof PAYMENT_METHOD_ICONS] ?? FileText

  return (
    <tr className="group border-b border-gray-100 last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="max-w-[200px]">
          <p className="truncate text-sm font-medium text-gray-900">{sale.product_name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <PaymentIcon size={12} />
            {SALES_PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof SALES_PAYMENT_METHOD_LABELS] ?? 'Nao informado'}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        {sale.contact ? (
          <Link href={`/dashboard/contacts/${sale.contact.id}`} className="flex items-center gap-2 hover:opacity-90">
            <ContactAvatar name={sale.contact.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-800">{sale.contact.name}</p>
              <p className="truncate text-xs text-gray-400">{sale.contact.company ?? ''}</p>
            </div>
          </Link>
        ) : (
          <span className="text-sm text-gray-400">— Sem cliente</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <p
          className={`text-sm font-medium ${
            sale.status === 'paid'
              ? 'text-green-600'
              : sale.status === 'pending'
                ? 'text-amber-600'
                : 'text-gray-400 line-through'
          }`}
        >
          {formatCurrency(Number(sale.value ?? 0))}
        </p>
      </td>
      <td className="px-4 py-3 align-top">
        <p className="text-sm text-gray-700">{formatSalesListDate(sale.sale_date)}</p>
        <p className="mt-1 text-xs text-gray-400">{formatSalesRelativeDate(sale.sale_date)}</p>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGES[sale.status as keyof typeof STATUS_BADGES] ?? STATUS_BADGES.pending}`}
        >
          {SALES_STATUS_LABELS[sale.status as keyof typeof SALES_STATUS_LABELS] ?? sale.status}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(open => !open)
              setConfirmDelete(false)
            }}
            className="rounded-md p-2 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 min-w-[190px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onEdit(sale)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <PencilLine size={14} />
                Editar lancamento
              </button>

              {sale.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onStatusChange(sale, 'paid')
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Zap size={14} />
                  Marcar como pago
                </button>
              )}

              {sale.status === 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onStatusChange(sale, 'pending')
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeftRight size={14} />
                  Marcar como pendente
                </button>
              )}

              <div className="my-1 h-px bg-gray-100" />

              <button
                type="button"
                onClick={() => {
                  if (confirmDelete) {
                    setMenuOpen(false)
                    onDelete(sale.id)
                    return
                  }

                  setConfirmDelete(true)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} />
                {confirmDelete ? 'Confirmar exclusao' : 'Excluir'}
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}
