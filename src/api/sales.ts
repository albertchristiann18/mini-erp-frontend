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

export const previewSalesOrderExcelImport = (file: File, marketplaceId: string, warehouseId: string) => {
  const form = new FormData()
  form.append('file', file)
  form.append('marketplace', marketplaceId)
  form.append('warehouse', warehouseId)
  return client.post('/sales-orders/import-preview/', form)
}

export const confirmSalesOrderExcelImport = (
  file: File,
  marketplaceId: string,
  warehouseId: string,
  skuMappings: { shopee_sku: string; variant_id: string }[],
  skipUnmatched: boolean,
) => {
  const form = new FormData()
  form.append('file', file)
  form.append('marketplace', marketplaceId)
  form.append('warehouse', warehouseId)
  form.append('sku_mappings', JSON.stringify(skuMappings))
  form.append('skip_unmatched', String(skipUnmatched))
  return client.post('/sales-orders/import-confirm/', form)
}
