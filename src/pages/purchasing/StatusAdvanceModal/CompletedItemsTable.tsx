/**
 * Editable order-items table shown inside StatusAdvanceModal when advancing a PO
 * to COMPLETED — lets the user fix a receiving discrepancy in the same action
 * as advancing status, instead of a detour through the PO detail page.
 */
import { Input } from '../../../components/ui/input'
import type { PurchaseOrderDetail } from '../../../types/purchasing'

interface CompletedItemsTableProps {
  visibleRows: PurchaseOrderDetail[]
  totalCount: number
  flaggedCount: number
  overThreshold: boolean
  showAll: boolean
  onShowAll: () => void
  editedQty: Record<string, string>
  onSetQty: (id: string, value: string) => void
}

export function CompletedItemsTable({
  visibleRows, totalCount, flaggedCount, overThreshold, showAll, onShowAll, editedQty, onSetQty,
}: CompletedItemsTableProps) {
  const canRevealMore = !overThreshold && !showAll && flaggedCount < totalCount

  return (
    <div className="space-y-2">
      <div className="max-h-[min(58vh,520px)] overflow-y-auto rounded-lg border">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-muted/50">
            <tr className="border-b text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Variant</th>
              <th className="px-3 py-2 text-left font-medium">Ordered</th>
              <th className="px-3 py-2 text-left font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(item => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-3 py-1.5">
                  <div className="flex flex-col">
                    <span className="font-mono font-medium">{item.product_variant_name}</span>
                    {item.sku_variant_code && (
                      <span className="text-[10px] text-muted-foreground font-mono leading-tight">{item.sku_variant_code}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5">{item.ordered_qty}</td>
                <td className="px-3 py-1.5">
                  <label className="sr-only" htmlFor={`received-qty-${item.id}`}>
                    Received qty for {item.product_variant_name}
                  </label>
                  <Input
                    id={`received-qty-${item.id}`}
                    type="number"
                    className="h-7 w-14 text-xs"
                    value={editedQty[item.id] ?? String(item.received_qty ?? '')}
                    onChange={e => onSetQty(item.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canRevealMore && (
        <button
          type="button"
          className="text-xs text-blue-600 underline"
          onClick={onShowAll}
        >
          Show all {totalCount} items
        </button>
      )}
    </div>
  )
}
