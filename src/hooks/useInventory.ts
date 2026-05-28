import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories, getProducts, createProduct, updateProduct,
  getProductVariants, getProductVariantStocks, getWarehouses, createWarehouse, updateWarehouse,
  getStockMovements, getMasterCategories,
  bulkCreateProducts, bulkUpdateInventory, adjustStock, getAvgSales, getInventorySummary,
} from '../api/inventory'
import client from '../api/client'
import type { Product } from '../types/inventory'

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useProducts = (page = 1, pageSize = 20, search?: string) => {
  const params: Record<string, string | number> = { page, page_size: pageSize }
  if (search) params.search = search
  return useQuery({
    queryKey: ['products', page, pageSize, search],
    queryFn: () => getProducts(params).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useProductVariants = (page = 1, pageSize = 100) =>
  useQuery({
    queryKey: ['product-variants', page, pageSize],
    queryFn: () => getProductVariants({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useWarehouses = (page = 1, pageSize = 100) =>
  useQuery({
    queryKey: ['warehouses', page, pageSize],
    queryFn: () => getWarehouses({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useCreateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createWarehouse(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export const useUpdateWarehouse = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateWarehouse(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  })
}

export const useStockMovements = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => getStockMovements(params).then(r => r.data),
    staleTime: 1000 * 60 * 1,
  })

export const useMasterCategories = () =>
  useQuery({
    queryKey: ['master-categories'],
    queryFn: () => getMasterCategories().then(r => r.data),
    staleTime: Infinity,
  })

export const useBulkCreateProducts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown[]) => bulkCreateProducts(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useBulkUpdateInventory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: Parameters<typeof bulkUpdateInventory>[0]) => bulkUpdateInventory(updates).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-movements'] }),
  })
}

export const useProductVariantStocks = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['product-variant-stocks', params],
    queryFn: () => getProductVariantStocks(params).then(r => r.data),
    staleTime: 1000 * 30,
  })

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof adjustStock>[0]) => adjustStock(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product-variant-stocks'] })
      qc.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['product', id],
    queryFn: () => client.get<Product>(`/product/${id}/`).then(r => r.data),
    enabled: !!id,
  })

export const useAvgSales = (variantIds: string[], days: number) =>
  useQuery({
    queryKey: ['avg-sales', variantIds, days],
    queryFn: () => getAvgSales(variantIds, days).then(r => r.data),
    enabled: variantIds.length > 0,
    staleTime: 1000 * 60 * 5,
  })

export const useAllVariants = () =>
  useQuery({
    queryKey: ['all-variants'],
    queryFn: () =>
      getProductVariants({ page_size: 500, is_active: 'true' }).then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useInventorySummary = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['inventory-summary'],
    queryFn: () => getInventorySummary().then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: options?.enabled ?? true,
  })

export const useStockClosingReport = (month: string, warehouseId: string) => {
  const [year, mon] = month.split("-")
  const monthStart = `${year}-${mon}-01`
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate()
  const monthEnd = `${year}-${mon}-${String(lastDay).padStart(2, "0")}`

  return useQuery({
    queryKey: ["stock-closing", month, warehouseId],
    queryFn: () => {
      const params: Record<string, string | number> = {
        page_size: 1000,
        cdate_after: monthStart,
        cdate_before: monthEnd,
      }
      if (warehouseId) params.warehouse = warehouseId
      return getStockMovements(params).then(r => r.data)
    },
    enabled: !!month,
    staleTime: 1000 * 60 * 5,
  })
}
