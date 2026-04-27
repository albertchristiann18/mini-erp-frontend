import client from './client'
import type { PurchaseOrder } from '../types/purchasing'
import type { PaginatedResponse } from '../types/inventory'

export const getPurchaseOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders/', { params })

export const getPurchaseOrder = (id: string) =>
  client.get<PurchaseOrder>(`/purchase-orders/${id}/`)

export const createPurchaseOrder = (data: Partial<PurchaseOrder>) =>
  client.post<PurchaseOrder>('/purchase-orders/', data)

export const updatePurchaseOrder = (id: string, data: Partial<PurchaseOrder>) =>
  client.patch<PurchaseOrder>(`/purchase-orders/${id}/`, data)
