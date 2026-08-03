import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSalesOrders, getSalesOrder,
  createSalesOrder, confirmSalesOrder, cancelSalesOrder,
  getReturns,
} from '../../api/sales'
import type { SOStatus } from '../../types/sales'
import { salesOrderKeys, salesReturnKeys } from '../../lib/salesKeys'

// staleTime tiers — sales orders and returns are transactional/volatile
const STALE_VOLATILE = 0  // always fresh

export const useSalesOrders = (status?: SOStatus, page = 1) =>
  useQuery({
    queryKey: salesOrderKeys.list({ status, page }),
    queryFn: () => getSalesOrders({ ...(status ? { status } : {}), page, page_size: 20 }),
    staleTime: STALE_VOLATILE,
  })

export const useSalesOrder = (id: string) =>
  useQuery({
    queryKey: salesOrderKeys.detail(id),
    queryFn: () => getSalesOrder(id),
    enabled: !!id,
    staleTime: STALE_VOLATILE,
  })

export const useCreateSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createSalesOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
  })
}

export const useConfirmSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => confirmSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
  })
}

export const useCancelSalesOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelSalesOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: salesOrderKeys.lists() }),
  })
}

export const useSalesReturns = (page = 1) =>
  useQuery({
    queryKey: salesReturnKeys.list({ page }),
    queryFn: () => getReturns({ page, page_size: 20 }),
    staleTime: STALE_VOLATILE,
  })

export const useSalesOrdersFiltered = (params: Record<string, string | number>) =>
  useQuery({
    queryKey: salesOrderKeys.list(params),
    queryFn: () => getSalesOrders(params),
    staleTime: STALE_VOLATILE,
  })
