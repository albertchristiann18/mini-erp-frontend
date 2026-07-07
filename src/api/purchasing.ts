import client from './client'
import type { PurchaseOrder, PurchaseOrderSummary, ReplenishmentItem, TransitionCheckResult, SourcingPoolPreviewResult, ColorAbbreviation, ImportAndAddRequest, ImportAndAddResult, ResolveSourcingConflictsRequest, ResolveSourcingConflictsResult } from '../types/purchasing'
import type { PaginatedResponse } from '../types/inventory'

export const getPurchaseOrders = (params?: Record<string, string | number>) =>
  client.get<PaginatedResponse<PurchaseOrder>>('/purchase-order/', { params })

export const getPurchaseOrder = (id: string) =>
  client.get<PurchaseOrder>(`/purchase-order/${id}/`)

export const createPurchaseOrder = (data: unknown) =>
  client.post<{ id: string }>('/purchase-order/', data)

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

export const checkPOTransition = (id: string, targetStatus: string) =>
  client.post<TransitionCheckResult>(`/purchase-order/${id}/check_transition/`, {
    status: targetStatus,
  })

export const getReplenishment = (params?: { warehouse_id?: string }) =>
  client.get<{ results: ReplenishmentItem[] }>('/replenishment/', { params })

export const getPurchaseOrderSummary = (params?: Record<string, string>) =>
  client.get<PurchaseOrderSummary>('/purchase-order/summary/', { params })

export const downloadSourcingPoolTemplate = () =>
  client.get('/sourcing-pool/template/', { responseType: 'blob' })

export const previewSourcingPoolUpload = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return client.post<SourcingPoolPreviewResult>('/sourcing-pool/preview/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getColorAbbreviations = () =>
  client.get<ColorAbbreviation[]>('/sourcing-pool/color-abbreviations/')

export const upsertColorAbbreviation = (data: { color_name: string; abbreviation: string }) =>
  client.post<ColorAbbreviation>('/sourcing-pool/color-abbreviations/', data)

export const deleteColorAbbreviation = (color_name: string) =>
  client.delete('/sourcing-pool/color-abbreviations/', { data: { color_name } })

export const importAndAdd = (poId: string, data: ImportAndAddRequest) =>
  client.post<ImportAndAddResult>(`/purchase-order/${poId}/import-and-add/`, data)

export const resolveSourcingConflicts = (poId: string, data: ResolveSourcingConflictsRequest) =>
  client.post<ResolveSourcingConflictsResult>(`/purchase-order/${poId}/resolve-sourcing-conflicts/`, data)
