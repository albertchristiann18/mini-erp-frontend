import { http } from '../lib/http'
import type { PaginatedResponse, ShopeeShop, CreateShopPayload, ShopeeWebhookLog } from '../types/shopee'

export const listShops = (page: number): Promise<PaginatedResponse<ShopeeShop>> =>
  http.get<PaginatedResponse<ShopeeShop>>('/api/shopee/shops/', { params: { page, page_size: 20 } })

export const createShop = (data: CreateShopPayload): Promise<ShopeeShop> =>
  http.post<ShopeeShop>('/api/shopee/shops/', data)

export const updateShop = (id: string, data: Partial<CreateShopPayload>): Promise<ShopeeShop> =>
  http.patch<ShopeeShop>(`/api/shopee/shops/${id}/`, data)

export const deleteShop = (id: string): Promise<undefined> =>
  http.delete<undefined>(`/api/shopee/shops/${id}/`)

export const triggerSync = (id: string): Promise<{ status: string }> =>
  http.post<{ status: string }>(`/api/shopee/shops/${id}/trigger_sync/`)

export const listWebhookLogs = (page: number, processed?: boolean): Promise<PaginatedResponse<ShopeeWebhookLog>> =>
  http.get<PaginatedResponse<ShopeeWebhookLog>>('/api/shopee/webhook-logs/', {
    params: { page, page_size: 20, ...(processed !== undefined ? { processed } : {}) },
  })
