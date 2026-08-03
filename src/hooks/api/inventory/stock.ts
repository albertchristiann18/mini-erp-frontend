import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '../../../lib/errors'
import {
  getProductVariantStocks, getStockMovements, bulkUpdateInventory, adjustStock, getAvgSales, getInventorySummary,
} from '../../../api/inventory'
import type { BulkUpdateResult } from '../../../api/inventory'
import type { InventorySummaryResponse } from '../../../types/inventory'
import {
  productVariantStockKeys, stockMovementKeys, warehouseKeys, inventorySummaryKeys, avgSalesKeys,
} from '../../../lib/inventoryKeys'

/** staleTime for volatile data (stock, movements, summaries) — 0 */
const STALE_VOLATILE = 0

// ─── Product Variant Stocks ───────────────────────────────────────────────────

export const useProductVariantStocks = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: productVariantStockKeys.list(params),
    queryFn: () => getProductVariantStocks(params),
    staleTime: STALE_VOLATILE,
  })

/**
 * Imperative variant-stock search hook.
 * Used by pages (BulkStockUpdatePage) that search on user action rather than on mount.
 * Returns a `search` function that resolves with paginated results.
 */
export const useSearchVariantStocks = () =>
  useMutation({
    mutationFn: (params: Record<string, string | number>) => getProductVariantStocks(params),
  })

// ─── Stock Movements ──────────────────────────────────────────────────────────

export const useStockMovements = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: stockMovementKeys.list(params),
    queryFn: () => getStockMovements(params),
    staleTime: STALE_VOLATILE,
  })

export const useStockClosingReport = (month: string, warehouseId: string) => {
  const [year, mon] = month.split('-')
  const monthStart = `${year}-${mon}-01`
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
  const monthEnd = `${year}-${mon}-${String(lastDay).padStart(2, '0')}`

  return useQuery({
    queryKey: stockMovementKeys.list({ month, warehouseId }),
    queryFn: () => {
      const params: Record<string, string | number> = {
        page_size: 1000,
        cdate_after: monthStart,
        cdate_before: monthEnd,
      }
      if (warehouseId) params.warehouse = warehouseId
      return getStockMovements(params)
    },
    enabled: !!month,
    staleTime: STALE_VOLATILE,
  })
}

// ─── Bulk Ops ─────────────────────────────────────────────────────────────────

export const useBulkUpdateInventory = () => {
  const qc = useQueryClient()
  return useMutation<BulkUpdateResult, unknown, Parameters<typeof bulkUpdateInventory>[0]>({
    mutationFn: (updates) => bulkUpdateInventory(updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: stockMovementKeys.all() }),
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adjustStock>[0]) => adjustStock(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productVariantStockKeys.all() })
      qc.invalidateQueries({ queryKey: warehouseKeys.all() })
    },
  })
}

// ─── Inventory Summary & Avg Sales ────────────────────────────────────────────

export const useInventorySummary = () =>
  useQuery<InventorySummaryResponse, ApiError>({
    queryKey: inventorySummaryKeys.all(),
    queryFn: () => getInventorySummary(),
    staleTime: STALE_VOLATILE,
  })

export const useAvgSales = (variantIds: string[], days: number) =>
  useQuery({
    queryKey: avgSalesKeys.list({ variantIds, days }),
    queryFn: () => getAvgSales(variantIds, days),
    enabled: variantIds.length > 0,
    staleTime: STALE_VOLATILE,
  })
