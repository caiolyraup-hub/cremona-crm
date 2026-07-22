'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { deleteSaleAction, updateSaleAction } from '@/app/(dashboard)/dashboard/sales/actions'
import { PageHeader } from '@/components/layout/page-header'
import { SaleModal } from '@/components/sales/sale-modal'
import { SalesList } from '@/components/sales/sales-list'
import { SalesReport } from '@/components/sales/sales-report'
import { SalesToolbar } from '@/components/sales/sales-toolbar'
import { useSales } from '@/hooks/use-sales'
import { formatCurrency } from '@/lib/formatters'
import { getSalesPeriodLabel, getVisibleSalesTotals } from '@/lib/sales'
import type { SaleStatus, SaleWithContact } from '@/types/app'

interface SalesClientProps {
  workspaceId: string
  contactId?: string
  contactName?: string
}

export function SalesClient({
  workspaceId,
  contactId,
  contactName,
}: SalesClientProps) {
  const router = useRouter()
  const {
    sales,
    summary,
    isLoading,
    isSummaryLoading,
    period,
    setPeriod,
    customStart,
    customEnd,
    setCustomRange,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    view,
    setView,
    refetch,
  } = useSales(workspaceId, contactId)

  const [displaySales, setDisplaySales] = useState<SaleWithContact[]>([])
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<SaleWithContact | null>(null)
  const [isMutating, startTransition] = useTransition()

  useEffect(() => {
    setDisplaySales(sales)
  }, [sales])

  const visibleTotals = useMemo(() => getVisibleSalesTotals(displaySales), [displaySales])
  const description = isSummaryLoading || !summary
    ? 'Carregando faturamento...'
    : `${formatCurrency(summary.totalPaid)} faturados · ${summary.count} venda${summary.count === 1 ? '' : 's'} · ${getSalesPeriodLabel(period, customStart, customEnd)}`

  function handleDelete(id: string) {
    const previous = displaySales
    setDisplaySales(current => current.filter(sale => sale.id !== id))

    startTransition(async () => {
      const result = await deleteSaleAction(id, workspaceId)
      if (result.error) {
        toast.error(result.error)
        setDisplaySales(previous)
        return
      }

      toast.success('Lancamento excluido com sucesso')
      refetch()
    })
  }

  function handleStatusChange(sale: SaleWithContact, status: SaleStatus) {
    const previous = displaySales
    setDisplaySales(current => {
      const next = current
        .map(item => (item.id === sale.id ? { ...item, status } : item))
        .filter(item => statusFilter === 'all' || item.status === statusFilter)
      return next
    })

    startTransition(async () => {
      const result = await updateSaleAction(
        sale.id,
        {
          status,
        },
        workspaceId
      )

      if (result.error) {
        toast.error(result.error)
        setDisplaySales(previous)
        return
      }

      toast.success(status === 'paid' ? 'Venda marcada como paga' : 'Venda marcada como pendente')
      refetch()
    })
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        description={description}
        action={
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[#378ADD] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d6bb5]"
          >
            <Plus size={15} />
            Novo lancamento
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { key: 'list', label: 'Lancamentos' },
          { key: 'report', label: 'Relatorio' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key as 'list' | 'report')}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              view === tab.key
                ? 'bg-[#378ADD] text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {contactId && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="flex-1 text-sm text-blue-700">
            Vendas de <strong>{contactName ?? 'contato'}</strong>
          </span>
          <button
            type="button"
            onClick={() => router.push('/dashboard/sales')}
            className="flex h-5 w-5 items-center justify-center rounded text-blue-400 hover:bg-blue-100 hover:text-blue-600"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {view === 'list' ? (
        <>
          <SalesToolbar
            period={period}
            onPeriodChange={setPeriod}
            customStart={customStart}
            customEnd={customEnd}
            onCustomRangeChange={setCustomRange}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            totalShowing={displaySales.length}
            totalValue={visibleTotals.paid}
          />

          <SalesList
            sales={displaySales}
            isLoading={isLoading || isMutating}
            onEdit={setEditingSale}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onCreate={() => setCreateModalOpen(true)}
          />
        </>
      ) : (
        <SalesReport
          summary={summary}
          isLoading={isSummaryLoading}
          period={period}
        />
      )}

      <SaleModal
        mode="create"
        workspaceId={workspaceId}
        defaultContactId={contactId}
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={refetch}
      />

      <SaleModal
        mode="edit"
        sale={editingSale ?? undefined}
        workspaceId={workspaceId}
        open={!!editingSale}
        onOpenChange={open => {
          if (!open) setEditingSale(null)
        }}
        onSuccess={() => {
          setEditingSale(null)
          refetch()
        }}
      />
    </div>
  )
}
