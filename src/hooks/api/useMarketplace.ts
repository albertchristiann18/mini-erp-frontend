import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks } from './createCrudHooks'
import {
  getMarketplaceConnections,
  createMarketplaceConnection,
  updateMarketplaceConnection,
  deleteMarketplaceConnection,
  toggleMarketplaceConnection,
} from '../../api/marketplace'
import type { PaginatedResponse as MarketplacePaginatedResponse } from '../../api/marketplace'
import type { MarketplaceConnection, MarketplaceConnectionFormData } from '../../types/marketplace'
import { listShops, createShop, updateShop, deleteShop, triggerSync, listWebhookLogs } from '../../api/shopee'
import { listTikTokShops, createTikTokShop, updateTikTokShop, deleteTikTokShop, refreshTikTokToken, listTikTokWebhookLogs } from '../../api/tiktok'
import type { PaginatedResponse, ShopeeShop, ShopeeWebhookLog, CreateShopPayload } from '../../types/shopee'
import type { TikTokShop, TikTokWebhookLog, TikTokShopFormData } from '../../types/tiktok'
import { marketplaceConnectionKeys, shopeeShopKeys, shopeeWebhookLogKeys, tikTokShopKeys, tikTokWebhookLogKeys } from '../../lib/marketplaceKeys'
import { marketplaceReconcileStock } from '../../api/inventory'
import type { ApiError } from '../../lib/errors'

export type { ReconcileResult } from '../../api/inventory'

// ── Marketplace Connections CRUD ──────────────────────────────────────────

const marketplaceConnectionHooks = createCrudHooks<
  MarketplaceConnection, MarketplacePaginatedResponse<MarketplaceConnection>,
  MarketplaceConnectionFormData, Partial<MarketplaceConnectionFormData>, number | undefined
>({
  resource: 'marketplace-connections',
  keys: marketplaceConnectionKeys,
  list: (page) => getMarketplaceConnections(page ?? 1),
  create: (data) => createMarketplaceConnection(data),
  update: ({ id, data }) => updateMarketplaceConnection(id, data),
  remove: (id) => deleteMarketplaceConnection(id),
})
export const useMarketplaceConnections = marketplaceConnectionHooks.useList
export const useCreateMarketplaceConnection = marketplaceConnectionHooks.useCreate
export const useUpdateMarketplaceConnection = marketplaceConnectionHooks.useUpdate
export const useDeleteMarketplaceConnection = marketplaceConnectionHooks.useDelete

// ── Shopee Shop CRUD ──────────────────────────────────────────────────────

const shopeeShopHooks = createCrudHooks<ShopeeShop, PaginatedResponse<ShopeeShop>, CreateShopPayload, Partial<CreateShopPayload>, number>({
  resource: 'shopee-shops',
  keys: shopeeShopKeys,
  list: (page) => listShops(page ?? 1),
  create: (data) => createShop(data),
  update: ({ id, data }) => updateShop(id, data),
  remove: (id) => deleteShop(id),
})
export const useShopeeShops = shopeeShopHooks.useList
export const useCreateShopeeShop = shopeeShopHooks.useCreate
export const useUpdateShopeeShop = shopeeShopHooks.useUpdate
export const useDeleteShopeeShop = shopeeShopHooks.useDelete

// ── TikTok Shop CRUD ──────────────────────────────────────────────────────

const tikTokShopHooks = createCrudHooks<TikTokShop, PaginatedResponse<TikTokShop>, TikTokShopFormData, Partial<TikTokShopFormData>, number>({
  resource: 'tiktok-shops',
  keys: tikTokShopKeys,
  list: (page) => listTikTokShops(page ?? 1),
  create: (data) => createTikTokShop(data),
  update: ({ id, data }) => updateTikTokShop(id, data),
  remove: (id) => deleteTikTokShop(id),
})
export const useTikTokShops = tikTokShopHooks.useList
export const useCreateTikTokShop = tikTokShopHooks.useCreate
export const useUpdateTikTokShop = tikTokShopHooks.useUpdate
export const useDeleteTikTokShop = tikTokShopHooks.useDelete

// ── Hand-written: custom actions / read-only (do not fit factory) ─────────

export const useToggleMarketplaceConnection = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => toggleMarketplaceConnection(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: marketplaceConnectionKeys.all() }) },
  })
}

export const useTriggerShopeeSync = () =>
  useMutation({ mutationFn: (id: string) => triggerSync(id) })

export const useShopeeWebhookLogs = (page: number, filter: string) => {
  const processed = filter === 'all' ? undefined : filter === 'processed'
  return useQuery<PaginatedResponse<ShopeeWebhookLog>, ApiError>({
    queryKey: shopeeWebhookLogKeys.list({ page, filter }),
    queryFn: () => listWebhookLogs(page, processed),
    staleTime: 0,
  })
}

export const useRefreshTikTokToken = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => refreshTikTokToken(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: tikTokShopKeys.all() }) },
  })
}

export const useTikTokWebhookLogs = (page: number) =>
  useQuery<PaginatedResponse<TikTokWebhookLog>, ApiError>({
    queryKey: tikTokWebhookLogKeys.list({ page }),
    queryFn: () => listTikTokWebhookLogs(page),
    staleTime: 0,
    refetchInterval: 30_000,
  })

export const useMarketplaceReconcileStock = () =>
  useMutation({
    mutationFn: (formData: FormData) => marketplaceReconcileStock(formData),
  })
