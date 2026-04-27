import client from './client'
import type { SalesOrder, SalesReturn } from '../types/sales'
import type { PaginatedResponse } from '../types/inventory'

export const getSalesOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<SalesOrder>>('/sales-orders/', { params })

export const getSalesOrder = (id: string) =>
  client.get<SalesOrder>(`/sales-orders/${id}/`)

export const updateSalesOrder = (id: string, data: Partial<SalesOrder>) =>
  client.patch<SalesOrder>(`/sales-orders/${id}/`, data)

export const getReturns = (salesOrderId: string) =>
  client.get<SalesReturn[]>(`/sales-orders/${salesOrderId}/returns/`)
