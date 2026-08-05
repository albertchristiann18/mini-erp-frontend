import { useMemo, useState } from 'react'
import type { PurchaseOrderDetail } from '../../types/purchasing'

/** Past this many discrepancy rows, filtering no longer meaningfully shrinks the list. */
const FALLBACK_THRESHOLD = 20

export interface OrderDetailQtyChange {
  id: string
  received_qty?: number
  remarks?: string
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
  const [editedRemarks, setEditedRemarks] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState(false)

  const setQty = (id: string, value: string) =>
    setEditedQty(prev => ({ ...prev, [id]: value }))

  const setRemarks = (id: string, value: string) =>
    setEditedRemarks(prev => ({ ...prev, [id]: value }))

  const effectiveReceivedQty = (item: PurchaseOrderDetail): number => {
    const edited = editedQty[item.id]
    if (edited !== undefined && edited !== '') return Number(edited)
    return item.received_qty ?? 0
  }

  /**
   * Mirrors the backend's own fallback (`detail_data.get("remarks") or existing_detail.remarks`):
   * an edited value wins, otherwise the row's already-stored remarks counts as the effective value.
   */
  const effectiveRemarks = (item: PurchaseOrderDetail): string =>
    editedRemarks[item.id] || item.remarks || ''

  /**
   * Broader than liveDiscrepancies below (`!==`, not `<`) — mirrors the backend's own
   * remarks-required condition, which covers over-receipt as well as under-receipt.
   */
  const isQtyDiscrepant = (item: PurchaseOrderDetail): boolean =>
    effectiveReceivedQty(item) !== item.ordered_qty

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

  const discrepantRowIds = useMemo(
    () => new Set(rows.filter(isQtyDiscrepant).map(item => item.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, editedQty],
  )

  const hasUnresolvedRemarks = useMemo(
    () => rows.some(item => isQtyDiscrepant(item) && effectiveRemarks(item) === ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, editedQty, editedRemarks],
  )

  const getChangedOrderDetails = (): OrderDetailQtyChange[] => {
    const changes = new Map<string, OrderDetailQtyChange>()

    for (const [id, value] of Object.entries(editedQty)) {
      if (value === '') continue
      const item = rows.find(r => r.id === id)
      if (item === undefined || Number(value) === (item.received_qty ?? 0)) continue
      changes.set(id, { ...changes.get(id), id, received_qty: Number(value) })
    }

    for (const [id, value] of Object.entries(editedRemarks)) {
      const item = rows.find(r => r.id === id)
      if (item === undefined || value === (item.remarks ?? '')) continue
      changes.set(id, { ...changes.get(id), id, remarks: value })
    }

    return Array.from(changes.values())
  }

  return {
    rows,
    flaggedRows,
    overThreshold,
    visibleRows,
    showAll,
    setShowAll,
    editedQty,
    setQty,
    editedRemarks,
    setRemarks,
    discrepantRowIds,
    hasUnresolvedRemarks,
    liveDiscrepancies,
    getChangedOrderDetails,
  }
}
