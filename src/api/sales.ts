import client from './client'
import type { SalesOrder, SalesReturn } from '../types/sales'
import type { PaginatedResponse } from '../types/inventory'

export const getSalesOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<SalesOrder>>('/sales-orders/', { params })

export const getSalesOrder = (id: string) =>
  client.get<SalesOrder>(`/sales-orders/${id}/`)

export const createSalesOrder = (data: unknown) =>
  client.post('/sales-orders/', data)

export const updateSalesOrder = (id: string, data: unknown) =>
  client.patch<SalesOrder>(`/sales-orders/${id}/`, data)

export const confirmSalesOrder = (id: string) =>
  client.post(`/sales-orders/${id}/confirm/`)

export const cancelSalesOrder = (id: string) =>
  client.post(`/sales-orders/${id}/cancel/`)

export const getReturns = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<SalesReturn>>('/sales-returns/', { params })
