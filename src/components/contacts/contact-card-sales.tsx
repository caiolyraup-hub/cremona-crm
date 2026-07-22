'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SaleModal } from '@/components/sales/sale-modal'
import { formatCurrency, formatRelativeDate } from '@/lib/formatters'
import { SALES_STATUS_LABELS } from '@/lib/sales'
import type { SaleWithContact } from '@/types/app'

interface ContactCardSalesProps {
  sales: SaleWithContact[]
  contactId: string
  workspaceId: string
  onRefresh: () => void
}

const STATUS_BADGES = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
} as const

export function ContactCardSales({
  sales,
  contactId,
  workspaceId,
  onRefresh,
}: ContactCardSalesProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const total = sales.reduce((sum, sale) => sum + Number(sale.value ?? 0), 0)
  const shown = sales.slice(0, 3)

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Vendas</p>
        <span className="text-xs font-medium text-green-600">{formatCurrency(total)} total</span>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="ml-auto flex h-6 items-center gap-1 rounded border border-gray-200 px-1.5 text-[11px] text-gray-500 transition-colors hover:border-[#378ADD] hover:text-[#378ADD]"
        >
          <Plus size={10} />
          Novo lancamento
        </button>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma venda registrada</p>
      ) : (
        <ul className="space-y-2">
          {shown.map(sale => (
            <li key={sale.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-800">{sale.product_name}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {formatRelativeDate(`${sale.sale_date}T12:00:00`)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(sale.value ?? 0))}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGES[sale.status as keyof typeof STATUS_BADGES] ?? STATUS_BADGES.pending}`}
                  >
                    {SALES_STATUS_LABELS[sale.status as keyof typeof SALES_STATUS_LABELS] ?? sale.status}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sales.length > 3 && (
        <Link href={`/dashboard/sales?contactId=${contactId}`} className="mt-2 block text-xs text-[#378ADD] hover:underline">
          Ver todas as {sales.length} vendas
        </Link>
      )}

      <SaleModal
        mode="create"
        workspaceId={workspaceId}
        defaultContactId={contactId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={onRefresh}
      />
    </div>
  )
}
