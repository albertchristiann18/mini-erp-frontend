import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders, getPurchaseOrder,
  createPurchaseOrder, updatePurchaseOrder, advancePOStatus, checkPOTransition, getReplenishment, getPurchaseOrderSummary,
} from '../../api/purchasing'
import type { POStatus } from '../../types/purchasing'

export const usePurchaseOrders = (status?: POStatus, page = 1) =>
  useQuery({
    queryKey: ['purchase-orders', status, page],
    queryFn: () => getPurchaseOrders({ ...(status ? { status } : {}), page, page_size: 20 }).then(r => r.data),
  })

export const usePurchaseOrder = (id: string) =>
  useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => getPurchaseOrder(id).then(r => r.data),
    enabled: !!id,
  })

export const useCreatePurchaseOrder = (onCreated?: (id: string) => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createPurchaseOrder(data).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      onCreated?.(data.id)
    },
  })
}

export const useCheckPOTransition = () =>
  useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      checkPOTransition(id, status).then(r => r.data),
  })

export const useAdvancePOStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => advancePOStatus(id, status),
    onSuccess: (_: unknown, variables: { id: string; status: string }) => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['purchase-order', variables.id] })
    },
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

export const usePurchaseOrdersFiltered = (params: Record<string, string | number>, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['purchase-orders', params],
    queryFn: () => getPurchaseOrders(params).then(r => r.data),
    enabled: options?.enabled ?? true,
  })

export const useReplenishment = (warehouseId?: string) =>
  useQuery({
    queryKey: ['replenishment', warehouseId],
    queryFn: () => getReplenishment(warehouseId ? { warehouse_id: warehouseId } : undefined).then(r => r.data),
  })

export const usePurchaseOrderSummary = (params?: Record<string, string>) =>
  useQuery({
    queryKey: ['purchase-order-summary', params],
    queryFn: () => getPurchaseOrderSummary(params).then(r => r.data),
  })
