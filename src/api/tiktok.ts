import client from './client'
import type { PaginatedResponse } from '../types/shopee'
import type { TikTokShop, TikTokWebhookLog, TikTokShopFormData } from '../types/tiktok'

export const listTikTokShops = (page: number) =>
  client.get<PaginatedResponse<TikTokShop>>('/api/tiktok/shops/', { params: { page, page_size: 20 } }).then(r => r.data)

export const createTikTokShop = (data: TikTokShopFormData) =>
  client.post<TikTokShop>('/api/tiktok/shops/', data).then(r => r.data)

export const updateTikTokShop = (id: string, data: Partial<TikTokShopFormData>) =>
  client.patch<TikTokShop>(`/api/tiktok/shops/${id}/`, data).then(r => r.data)

export const deleteTikTokShop = (id: string) =>
  client.delete(`/api/tiktok/shops/${id}/`).then(() => undefined)

export const refreshTikTokToken = (id: string) =>
  client.post<TikTokShop>(`/api/tiktok/shops/${id}/refresh_token/`).then(r => r.data)

export const listTikTokWebhookLogs = (page: number) =>
  client.get<PaginatedResponse<TikTokWebhookLog>>('/api/tiktok/webhook-logs/', { params: { page, page_size: 20 } }).then(r => r.data)
