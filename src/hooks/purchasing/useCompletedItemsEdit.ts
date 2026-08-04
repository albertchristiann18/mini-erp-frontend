import { useMemo, useState } from 'react'
import type { PurchaseOrderDetail } from '../../types/purchasing'

/** Past this many discrepancy rows, filtering no longer meaningfully shrinks the list. */
const FALLBACK_THRESHOLD = 20

export interface OrderDetailQtyChange {
  id: string
  received_qty: number
}

export interface DiscrepancyRow {
  id: string
  name: string
  ordered_qty: number
  received_qty: number
}

/**
 * Local edit state for the COMPLETED-transition order-items table inside
 * StatusAdvanceModal: which rows are visible (filtered vs. all), the in-flight
 * received_qty edits, and a live-recomputed discrepancy list for the warning banner.
 */
export function useCompletedItemsEdit(orderDetails: PurchaseOrderDetail[] | undefined) {
  const rows = useMemo(() => orderDetails ?? [], [orderDetails])
  const [editedQty, setEditedQty] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)

  const setQty = (id: string, value: string) =>
    setEditedQty(prev => ({ ...prev, [id]: value }))

  const effectiveReceivedQty = (item: PurchaseOrderDetail): number => {
    const edited = editedQty[item.id]
    if (edited !== undefined && edited !== '') return Number(edited)
    return item.received_qty ?? 0
  }

  const flaggedRows = useMemo(
    () => rows.filter(item => (item.received_qty ?? 0) !== item.ordered_qty),
    [rows],
  )

  const overThreshold = flaggedRows.length > FALLBACK_THRESHOLD

  const visibleRows = overThreshold ? rows : (showAll ? rows : flaggedRows)

  const liveDiscrepancies: DiscrepancyRow[] = useMemo(
    () =>
      rows
        .filter(item => effectiveReceivedQty(item) < item.ordered_qty)
        .map(item => ({
          id: item.id,
          name: item.product_variant_name,
          ordered_qty: item.ordered_qty,
          received_qty: effectiveReceivedQty(item),
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, editedQty],
  )

  const getChangedOrderDetails = (): OrderDetailQtyChange[] =>
    Object.entries(editedQty)
      .filter(([, value]) => value !== '')
      .filter(([id, value]) => {
        const item = rows.find(r => r.id === id)
        return item !== undefined && Number(value) !== (item.received_qty ?? 0)
      })
      .map(([id, value]) => ({ id, received_qty: Number(value) }))

  return {
    rows,
    flaggedRows,
    overThreshold,
    visibleRows,
    showAll,
    setShowAll,
    editedQty,
    setQty,
    liveDiscrepancies,
    getChangedOrderDetails,
  }
}
