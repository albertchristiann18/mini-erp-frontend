import { http } from '../lib/http'
import type { SalesOrder, SalesReturn, ExcelImportPreviewResponse, ExcelImportConfirmResponse } from '../types/sales'
import type { PaginatedResponse } from '../types/inventory'

export const getSalesOrders = (params?: Record<string, string | number>): Promise<PaginatedResponse<SalesOrder>> =>
  http.get<PaginatedResponse<SalesOrder>>('/sales-orders/', { params })

export const getSalesOrder = (id: string): Promise<SalesOrder> =>
  http.get<SalesOrder>(`/sales-orders/${id}/`)

export const createSalesOrder = (data: unknown): Promise<SalesOrder> =>
  http.post<SalesOrder>('/sales-orders/', data)

export const updateSalesOrder = (id: string, data: unknown): Promise<SalesOrder> =>
  http.patch<SalesOrder>(`/sales-orders/${id}/`, data)

export const confirmSalesOrder = (id: string): Promise<unknown> =>
  http.post(`/sales-orders/${id}/confirm/`)

export const cancelSalesOrder = (id: string): Promise<unknown> =>
  http.post(`/sales-orders/${id}/cancel/`)

export const getReturns = (params?: Record<string, string | number>): Promise<PaginatedResponse<SalesReturn>> =>
  http.get<PaginatedResponse<SalesReturn>>('/sales-returns/', { params })

export const previewSalesOrderExcelImport = (
  file: File,
  marketplaceId: string,
  warehouseId: string,
): Promise<ExcelImportPreviewResponse> => {
  const form = new FormData()
  form.append('file', file)
  form.append('marketplace', marketplaceId)
  form.append('warehouse', warehouseId)
  return http.post<ExcelImportPreviewResponse>('/sales-orders/import-preview/', form)
}

export const confirmSalesOrderExcelImport = (
  file: File,
  marketplaceId: string,
  warehouseId: string,
  skuMappings: { shopee_sku: string; variant_id: string }[],
  skipUnmatched: boolean,
): Promise<ExcelImportConfirmResponse> => {
  const form = new FormData()
  form.append('file', file)
  form.append('marketplace', marketplaceId)
  form.append('warehouse', warehouseId)
  form.append('sku_mappings', JSON.stringify(skuMappings))
  form.append('skip_unmatched', String(skipUnmatched))
  return http.post<ExcelImportConfirmResponse>('/sales-orders/import-confirm/', form)
}
