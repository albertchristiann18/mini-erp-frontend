import { useQuery } from '@tanstack/react-query'
import { getSalesOrders, getSalesOrder, getReturns } from '../api/sales'
import type { SOStatus } from '../types/sales'

export const useSalesOrders = (status?: SOStatus, page = 1) =>
  useQuery({
    queryKey: ['sales-orders', status, page],
    queryFn: () => getSalesOrders({ ...(status ? { status } : {}), page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const useSalesOrder = (id: string) =>
  useQuery({
    queryKey: ['sales-order', id],
    queryFn: () => getSalesOrder(id).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  })

export const useSalesReturns = (salesOrderId: string) =>
  useQuery({
    queryKey: ['sales-returns', salesOrderId],
    queryFn: () => getReturns(salesOrderId).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!salesOrderId,
  })
