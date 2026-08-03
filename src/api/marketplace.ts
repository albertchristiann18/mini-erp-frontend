import { http } from '../lib/http'
import type { MarketplaceConnection, MarketplaceConnectionFormData } from '../types/marketplace'

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export const getMarketplaceConnections = (page = 1): Promise<PaginatedResponse<MarketplaceConnection>> =>
  http.get<PaginatedResponse<MarketplaceConnection>>('/marketplace-connections/', { params: { page } })

export const createMarketplaceConnection = (data: MarketplaceConnectionFormData): Promise<MarketplaceConnection> =>
  http.post<MarketplaceConnection>('/marketplace-connections/', data)

export const updateMarketplaceConnection = (id: string, data: Partial<MarketplaceConnectionFormData>): Promise<MarketplaceConnection> =>
  http.patch<MarketplaceConnection>(`/marketplace-connections/${id}/`, data)

export const deleteMarketplaceConnection = (id: string): Promise<unknown> =>
  http.delete(`/marketplace-connections/${id}/`)

export const toggleMarketplaceConnection = (id: string): Promise<MarketplaceConnection> =>
  http.post<MarketplaceConnection>(`/marketplace-connections/${id}/toggle_active/`)
