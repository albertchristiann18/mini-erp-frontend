import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPurchaseOrders, getPurchaseOrder,
  createPurchaseOrder, updatePurchaseOrder, advancePOStatus, checkPOTransition, getReplenishment, getPurchaseOrderSummary,
} from '../../api/purchasing'
import {
  purchaseOrderKeys,
  replenishmentKeys,
  purchaseOrderSummaryKeys,
} from '../../lib/purchasingKeys'
import type { POStatus } from '../../types/purchasing'

export const usePurchaseOrders = (status?: POStatus, page = 1) =>
  useQuery({
    queryKey: purchaseOrderKeys.list({ status, page }),
    queryFn: () => getPurchaseOrders({ ...(status ? { status } : {}), page, page_size: 20 }),
  })

export const usePurchaseOrder = (id: string) =>
  useQuery({
    queryKey: purchaseOrderKeys.detail(id),
    queryFn: () => getPurchaseOrder(id),
    enabled: !!id,
  })

export const useCreatePurchaseOrder = (onCreated?: (id: string) => void) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => createPurchaseOrder(data),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.lists() })
      onCreated?.(data.id)
    },
  })
}

export const useCheckPOTransition = () =>
  useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      checkPOTransition(id, status),
  })

export const useAdvancePOStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => advancePOStatus(id, status),
    onSuccess: (_: unknown, variables: { id: string; status: string }) => {
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.lists() })
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.id) })
    },
  })
}

export const useUpdatePurchaseOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePurchaseOrder(id, data),
    onSuccess: (_: unknown, variables: { id: string; data: Record<string, unknown> }) => {
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.lists() })
      void qc.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.id) })
    },
  })
}

export const usePurchaseOrdersFiltered = (params: Record<string, string | number>, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: () => getPurchaseOrders(params),
    enabled: options?.enabled ?? true,
  })

export const useReplenishment = (warehouseId?: string) =>
  useQuery({
    queryKey: replenishmentKeys.list({ warehouseId }),
    queryFn: () => getReplenishment(warehouseId ? { warehouse_id: warehouseId } : undefined),
  })

export const usePurchaseOrderSummary = (params?: Record<string, string>) =>
  useQuery({
    queryKey: purchaseOrderSummaryKeys.list(params),
    queryFn: () => getPurchaseOrderSummary(params),
  })

