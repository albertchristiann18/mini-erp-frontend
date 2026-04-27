import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders, getPurchaseOrder,
  createPurchaseOrder, advancePOStatus,
} from '../api/purchasing'
import type { POStatus } from '../types/purchasing'

export const usePurchaseOrders = (status?: POStatus, page = 1) =>
  useQuery({
    queryKey: ['purchase-orders', status, page],
    queryFn: () => getPurchaseOrders({ ...(status ? { status } : {}), page, page_size: 20 }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })

export const usePurchaseOrder = (id: string) =>
  useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id).then(r => r.data),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  })

export const useCreatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createPurchaseOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export const useAdvancePOStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => advancePOStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}
