import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProductVariants, getProductVariantStocks, updateVariantPrice, saveVariants } from '../../../api/inventory'
import type { SaveVariantsPayload } from '../../../api/inventory'
import { productKeys, productVariantKeys, variantSearchKeys, inventorySummaryKeys } from '../../../lib/inventoryKeys'

// ─── Product Variants ─────────────────────────────────────────────────────────

export const useProductVariants = (page = 1, pageSize = 100) =>
  useQuery({
    queryKey: productVariantKeys.list({ page, pageSize }),
    queryFn: () => getProductVariants({ page, page_size: pageSize }),
  })

export const useVariantSearch = (
  params: { search?: string; page_size?: number; supplier_id?: string },
  enabled = true,
) =>
  useQuery({
    queryKey: variantSearchKeys.list(params),
    queryFn: () => getProductVariantStocks({ ...params }),
    enabled,
  })

export const useAllVariants = () =>
  useQuery({
    queryKey: productVariantKeys.list({ page_size: 500, is_active: 'true' }),
    queryFn: () => getProductVariants({ page_size: 500, is_active: 'true' }),
  })

// ─── Variant Price ────────────────────────────────────────────────────────────

export const useUpdateVariantPrice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, variantId, basePrice }: { productId: string; variantId: string; basePrice: number }) =>
      updateVariantPrice(productId, variantId, basePrice),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(variables.productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
      qc.invalidateQueries({ queryKey: inventorySummaryKeys.all() })
    },
  })
}

// ─── Save Variants ────────────────────────────────────────────────────────────

/**
 * Per-call variant: productId is passed per-mutation-call.
 * Used by pages (ProductEditPage) that need to save variants for a newly-created product
 * whose id is not known at hook-construction time.
 */
export const useSaveAnyVariants = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: SaveVariantsPayload }) =>
      saveVariants(productId, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(variables.productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}

export const useSaveVariants = (productId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveVariantsPayload) => saveVariants(productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) })
      qc.invalidateQueries({ queryKey: productKeys.all() })
    },
  })
}
