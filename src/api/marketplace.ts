import apiClient from './client'
import type { MarketplaceConnection, MarketplaceConnectionFormData } from '../types/marketplace'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const getMarketplaceConnections = (page = 1) =>
  apiClient.get<PaginatedResponse<MarketplaceConnection>>('/marketplace-connections/', { params: { page } }).then(r => r.data)

export const createMarketplaceConnection = (data: MarketplaceConnectionFormData) =>
  apiClient.post<MarketplaceConnection>('/marketplace-connections/', data).then(r => r.data)

export const updateMarketplaceConnection = (id: string, data: Partial<MarketplaceConnectionFormData>) =>
  apiClient.patch<MarketplaceConnection>(`/marketplace-connections/${id}/`, data).then(r => r.data)

export const deleteMarketplaceConnection = (id: string) =>
  apiClient.delete(`/marketplace-connections/${id}/`).then(r => r.data)

export const toggleMarketplaceConnection = (id: string) =>
  apiClient.post<MarketplaceConnection>(`/marketplace-connections/${id}/toggle_active/`).then(r => r.data)
