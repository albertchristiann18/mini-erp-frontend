import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchaseOrders, getPurchaseOrder, updatePurchaseOrder } from '../api/purchasing'
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

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePurchaseOrder(id, data as never),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}
