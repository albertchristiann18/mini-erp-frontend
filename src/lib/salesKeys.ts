/**
 * Sales domain query-key factories.
 *
 * Single source of truth for all sales query keys and invalidation targets.
 * Pass these factories to hand-written hooks and use them for invalidation.
 */
import { createQueryKeys } from './queryKeys'

export const salesOrderKeys = createQueryKeys('sales-orders')
export const salesReturnKeys = createQueryKeys('sales-returns')
