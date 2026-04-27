import { useQuery } from '@tanstack/react-query'
import { getProducts, getProductVariants, getWarehouses, getStockMovements } from '../api/inventory'

export const useProducts = (page = 1, pageSize = 20) =>
  useQuery({
    queryKey: ['products', page, pageSize],
    queryFn: () => getProducts({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useProductVariants = (page = 1, pageSize = 20) =>
  useQuery({
    queryKey: ['product-variants', page, pageSize],
    queryFn: () => getProductVariants({ page, page_size: pageSize }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useWarehouses = () =>
  useQuery({
    queryKey: ['warehouses'],
    queryFn: () => getWarehouses().then(r => r.data),
    staleTime: 1000 * 60 * 10,
  })

export const useStockMovements = (params: Record<string, string | number> = {}) =>
  useQuery({
    queryKey: ['stock-movements', params],
    queryFn: () => getStockMovements(params).then(r => r.data),
    staleTime: 1000 * 60 * 1,
  })
