import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders, getPurchaseOrder,
  createPurchaseOrder, updatePurchaseOrder, advancePOStatus,
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

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePurchaseOrder(id, data),
    onSuccess: (_: unknown, variables: { id: string; data: Record<string, unknown> }) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order', variables.id] })
    },
  })
}

export const usePurchaseOrdersFiltered = (params: Record<string, string | number>) =>
  useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => getPurchaseOrders(params).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })
