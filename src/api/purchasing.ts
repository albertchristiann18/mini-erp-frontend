import client from './client'
import type { PurchaseOrder, PurchaseOrderSummary, ReplenishmentItem } from '../types/purchasing'
import type { PaginatedResponse } from '../types/inventory'

export const getPurchaseOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<PurchaseOrder>>('/purchase-order/', { params })

export const getPurchaseOrder = (id: string) =>
  client.get<PurchaseOrder>(`/purchase-order/${id}/`)

export const createPurchaseOrder = (data: unknown) =>
  client.post('/purchase-order/', data)

export const updatePurchaseOrder = (id: string, data: Record<string, unknown>) => {
  const hasFile = Object.values(data).some(v => v instanceof File)
  if (hasFile) {
    const form = new FormData()
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue
      if (value instanceof File) form.append(key, value)
      else if (Array.isArray(value) || typeof value === 'object') form.append(key, JSON.stringify(value))
      else form.append(key, String(value))
    }
    return client.patch(`/purchase-order/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  return client.patch(`/purchase-order/${id}/`, data)
}

export const advancePOStatus = (id: string, status: string) =>
  client.post(`/purchase-order/${id}/advance_status/`, { status })

export const getReplenishment = (params?: { warehouse_id?: string }) =>
  client.get<{ results: ReplenishmentItem[] }>('/replenishment/', { params })

export const getPurchaseOrderSummary = (params?: Record<string, string>) =>
  client.get<PurchaseOrderSummary>('/purchase-order/summary/', { params })
