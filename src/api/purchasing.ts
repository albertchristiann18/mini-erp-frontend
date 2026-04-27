import client from './client'
import type { PurchaseOrder } from '../types/purchasing'
import type { PaginatedResponse } from '../types/inventory'

export const getPurchaseOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<PurchaseOrder>>('/purchase-order/', { params })

export const getPurchaseOrder = (id: string) =>
  client.get<PurchaseOrder>(`/purchase-order/${id}/`)

export const createPurchaseOrder = (data: unknown) =>
  client.post('/purchase-order/', data)

export const updatePurchaseOrder = (id: string, data: unknown) =>
  client.patch(`/purchase-order/${id}/`, data)

export const advancePOStatus = (id: string, status: string) =>
  client.post(`/purchase-order/${id}/advance_status/`, { status })
