/**
 * stockHelpers — pure types and computation helpers for the StockPage domain.
 *
 * Owns: AdjustType, PendingChange types, and computePreview (pure function).
 * No side-effects, no imports from api/ or contexts/.
 */

export type AdjustType = 'add' | 'min' | 'set'

export interface PendingChange {
  variantId: string
  variantName: string
  productName: string
  currentQty: number
  type: AdjustType
  qty: number
}

/**
 * Compute the preview stock quantity for a given adjustment.
 */
export function computePreview(current: number, type: AdjustType, qty: number): number {
  if (type === 'add') return current + qty
  if (type === 'min') return Math.max(0, current - qty)
  return qty
}

/**
 * Format an adjustment as a display label.
 *
 * @param spaceBeforeSet - whether to insert a space between '=' and the qty
 *   (false → '=N', true → '= N'). Different call-sites use different formats;
 *   callers must pass the flag that matches their original rendering.
 */
export function formatAdjustment(type: AdjustType, qty: number | string, spaceBeforeSet = false): string {
  if (type === 'add') return `+${qty}`
  if (type === 'min') return `−${qty}`
  return spaceBeforeSet ? `= ${qty}` : `=${qty}`
}
