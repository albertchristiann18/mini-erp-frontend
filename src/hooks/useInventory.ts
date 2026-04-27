import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories, getProducts, createProduct, updateProduct,
  getProductVariants, getWarehouses, createWarehouse, updateWarehouse,
  getStockMovements,
} from '../api/inventory'

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useProducts = (page = 1, pageSize = 20) =>
  useQuery({
    queryKey: ['products', page, pageSize],
    queryFn: () => getProducts({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

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
