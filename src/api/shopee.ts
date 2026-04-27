import client from './client'
import type { PaginatedResponse, ShopeeShop, CreateShopPayload, ShopeeWebhookLog } from '../types/shopee'

export const listShops = (page: number) =>
  client.get<PaginatedResponse<ShopeeShop>>('/api/shopee/shops/', { params: { page, page_size: 20 } }).then(r => r.data)

export const createShop = (data: CreateShopPayload) =>
  client.post<ShopeeShop>('/api/shopee/shops/', data).then(r => r.data)

export const updateShop = (id: string, data: Partial<CreateShopPayload>) =>
  client.patch<ShopeeShop>(`/api/shopee/shops/${id}/`, data).then(r => r.data)

export const deleteShop = (id: string) =>
  client.delete(`/api/shopee/shops/${id}/`).then(() => undefined)

export const triggerSync = (id: string) =>
  client.post<{ status: string }>(`/api/shopee/shops/${id}/trigger_sync/`).then(r => r.data)

export const listWebhookLogs = (page: number, processed?: boolean) =>
  client.get<PaginatedResponse<ShopeeWebhookLog>>('/api/shopee/webhook-logs/', {
    params: { page, page_size: 20, ...(processed !== undefined ? { processed } : {}) },
  }).then(r => r.data)
