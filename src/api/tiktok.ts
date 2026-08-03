import { http } from '../lib/http'
import type { PaginatedResponse } from '../types/shopee'
import type { TikTokShop, TikTokWebhookLog, TikTokShopFormData } from '../types/tiktok'

export const listTikTokShops = (page: number): Promise<PaginatedResponse<TikTokShop>> =>
  http.get<PaginatedResponse<TikTokShop>>('/api/tiktok/shops/', { params: { page, page_size: 20 } })

export const createTikTokShop = (data: TikTokShopFormData): Promise<TikTokShop> =>
  http.post<TikTokShop>('/api/tiktok/shops/', data)

export const updateTikTokShop = (id: string, data: Partial<TikTokShopFormData>): Promise<TikTokShop> =>
  http.patch<TikTokShop>(`/api/tiktok/shops/${id}/`, data)

export const deleteTikTokShop = (id: string): Promise<undefined> =>
  http.delete<undefined>(`/api/tiktok/shops/${id}/`)

export const refreshTikTokToken = (id: string): Promise<TikTokShop> =>
  http.post<TikTokShop>(`/api/tiktok/shops/${id}/refresh_token/`)

export const listTikTokWebhookLogs = (page: number): Promise<PaginatedResponse<TikTokWebhookLog>> =>
  http.get<PaginatedResponse<TikTokWebhookLog>>('/api/tiktok/webhook-logs/', { params: { page, page_size: 20 } })
