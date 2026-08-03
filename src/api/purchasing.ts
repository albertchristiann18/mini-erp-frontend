import { http } from '../lib/http'
import type { PurchaseOrder, PurchaseOrderSummary, ReplenishmentItem, TransitionCheckResult, SourcingPoolPreviewResult, ColorAbbreviation, ImportAndAddRequest, ImportAndAddResult, ResolveSourcingConflictsRequest, ResolveSourcingConflictsResult } from '../types/purchasing'
import type { PaginatedResponse } from '../types/inventory'

export const getPurchaseOrders = (params?: Record<string, string | number>) =>
  http.get<PaginatedResponse<PurchaseOrder>>('/purchase-order/', { params })

export const getPurchaseOrder = (id: string) =>
  http.get<PurchaseOrder>(`/purchase-order/${id}/`)

export const createPurchaseOrder = (data: unknown) =>
  http.post<{ id: string }>('/purchase-order/', data)

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
    return http.patch<unknown>(`/purchase-order/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  return http.patch<unknown>(`/purchase-order/${id}/`, data)
}

export const advancePOStatus = (id: string, status: string) =>
  http.post<unknown>(`/purchase-order/${id}/advance_status/`, { status })

export const checkPOTransition = (id: string, targetStatus: string) =>
  http.post<TransitionCheckResult>(`/purchase-order/${id}/check_transition/`, {
    status: targetStatus,
  })

export const getReplenishment = (params?: { warehouse_id?: string }) =>
  http.get<{ results: ReplenishmentItem[] }>('/replenishment/', { params })

export const getPurchaseOrderSummary = (params?: Record<string, string>) =>
  http.get<PurchaseOrderSummary>('/purchase-order/summary/', { params })

export const downloadSourcingPoolTemplate = () =>
  http.get<Blob>('/sourcing-pool/template/', { responseType: 'blob' })

export const previewSourcingPoolUpload = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return http.post<SourcingPoolPreviewResult>('/sourcing-pool/preview/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getColorAbbreviations = () =>
  http.get<ColorAbbreviation[]>('/sourcing-pool/color-abbreviations/')

export const upsertColorAbbreviation = (data: { color_name: string; abbreviation: string }) =>
  http.post<ColorAbbreviation>('/sourcing-pool/color-abbreviations/', data)

export const deleteColorAbbreviation = (color_name: string) =>
  http.delete('/sourcing-pool/color-abbreviations/', { data: { color_name } })

export const importAndAdd = (poId: string, data: ImportAndAddRequest) =>
  http.post<ImportAndAddResult>(`/purchase-order/${poId}/import-and-add/`, data)

export const resolveSourcingConflicts = (poId: string, data: ResolveSourcingConflictsRequest) =>
  http.post<ResolveSourcingConflictsResult>(`/purchase-order/${poId}/resolve-sourcing-conflicts/`, data)

export const fetchPhotoViaProxy = (productId: string, dimKey?: string, dimValue?: string) => {
  const params = new URLSearchParams()
  if (dimKey) params.set('dim_key', dimKey)
  if (dimValue) params.set('dim_value', dimValue)
  const query = params.toString() ? `?${params.toString()}` : ''
  return http.get<Blob>(`/product/${productId}/photo-proxy/${query}`, { responseType: 'blob' })
}
