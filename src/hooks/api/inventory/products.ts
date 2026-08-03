import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, createProduct, updateProduct, bulkCreateProducts } from '../../../api/inventory'
import type { BulkCreateResult } from '../../../api/inventory'
import { http } from '../../../lib/http'
import type { Product } from '../../../types/inventory'
import { productKeys, variantSearchKeys } from '../../../lib/inventoryKeys'

// ─── Products ─────────────────────────────────────────────────────────────────

export const useProducts = (page = 1, pageSize = 20, search?: string, category?: string, ordering?: string) => {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (search) params.search = search
  if (category) params.category = category
  if (ordering) params.ordering = ordering
  return useQuery({
    queryKey: productKeys.list({ page, pageSize, search, category, ordering }),
    queryFn: () => getProducts(params),
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createProduct(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all() })
      qc.invalidateQueries({ queryKey: variantSearchKeys.all() })
    },
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  })
}

export const useProduct = (id: string) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => http.get<Product>(`/product/${id}/`),
    enabled: !!id,
  })

// ─── Bulk Ops ─────────────────────────────────────────────────────────────────

export const useBulkCreateProducts = () => {
  const qc = useQueryClient()
  return useMutation<BulkCreateResult, unknown, unknown[]>({
    mutationFn: (data) => bulkCreateProducts(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all() }),
  })
}
