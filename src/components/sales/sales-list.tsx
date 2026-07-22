import { DollarSign } from 'lucide-react'
import { SalesListRow } from '@/components/sales/sales-list-row'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency } from '@/lib/formatters'
import { getVisibleSalesTotals } from '@/lib/sales'
import type { SaleStatus, SaleWithContact } from '@/types/app'

interface SalesListProps {
  sales: SaleWithContact[]
  isLoading: boolean
  onEdit: (sale: SaleWithContact | null) => void
  onDelete: (id: string) => void
  onStatusChange: (sale: SaleWithContact, status: SaleStatus) => void
  onCreate: () => void
}

export function SalesList({
  sales,
  isLoading,
  onEdit,
  onDelete,
  onStatusChange,
  onCreate,
}: SalesListProps) {
  const totals = getVisibleSalesTotals(sales)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-6 gap-3">
                  {Array.from({ length: 6 }).map((__, innerIndex) => (
                    <div key={innerIndex} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="Nenhum lancamento encontrado"
            description="Registre sua primeira venda ou ajuste os filtros aplicados"
            action={{ label: 'Registrar venda', onClick: onCreate }}
          />
        ) : (
          <table className="min-w-full">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                {['Produto/Servico', 'Cliente', 'Valor', 'Data', 'Status', 'Acoes'].map(column => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <SalesListRow
                  key={sale.id}
                  sale={sale}
                  onEdit={nextSale => onEdit(nextSale)}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && sales.length > 0 && (
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
          Total: {sales.length} lancamento{sales.length === 1 ? '' : 's'} · Pago:{' '}
          <span className="font-medium text-gray-900">{formatCurrency(totals.paid)}</span> ·
          {' '}Pendente: <span className="font-medium text-gray-900">{formatCurrency(totals.pending)}</span> ·
          {' '}Cancelado: <span className="font-medium text-gray-900">{formatCurrency(totals.cancelled)}</span>
        </div>
      )}
    </div>
  )
}
