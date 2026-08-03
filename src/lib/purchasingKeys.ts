/**
 * Purchasing domain query-key factories.
 *
 * Single source of truth for all purchasing query keys and invalidation targets.
 * Pass these factories to hooks and use them directly for invalidation.
 */
import { createQueryKeys } from './queryKeys'

export const purchaseOrderKeys = createQueryKeys('purchase-orders')
export const replenishmentKeys = createQueryKeys('replenishment')
export const colorAbbreviationKeys = createQueryKeys('color-abbreviations')
export const purchaseOrderSummaryKeys = createQueryKeys('purchase-order-summary')
