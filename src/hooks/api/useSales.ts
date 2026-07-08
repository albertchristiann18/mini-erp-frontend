import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSalesOrders, getSalesOrder,
  createSalesOrder, confirmSalesOrder, cancelSalesOrder,
  getReturns,
} from '../../api/sales'
import type { SOStatus } from '../../types/sales'

export const useSalesOrders = (status?: SOStatus, page = 1) =>
  useQuery({
    queryKey: ['sales-orders', status, page],
    queryFn: () => getSalesOrders({ ...(status ? { status } : {}), page, page_size: 20 }).then(r => r.data),
  })

export const useSalesOrder = (id: string) =>
  useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => getSalesOrder(id).then(r => r.data),
    enabled: !!id,
  })

export const useCreateSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createSalesOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })
}

export const useConfirmSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => confirmSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })
}

export const useCancelSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-orders'] }),
  })
}

export const useSalesReturns = (page = 1) =>
  useQuery({
    queryKey: ['sales-returns', page],
    queryFn: () => getReturns({ page, page_size: 20 }).then(r => r.data),
  })

export const useSalesOrdersFiltered = (params: Record<string, string | number>) =>
  useQuery({
    queryKey: ['sales-orders-filtered', params],
    queryFn: () => getSalesOrders(params).then(r => r.data),
  })
