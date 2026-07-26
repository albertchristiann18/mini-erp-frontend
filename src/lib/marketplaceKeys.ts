/**
 * Marketplace domain query-key factories.
 *
 * Single source of truth for all marketplace query keys and invalidation targets.
 * Pass these factories to hand-written hooks and CRUD configs to avoid literal key arrays.
 */
import { createQueryKeys } from './queryKeys'

export const marketplaceConnectionKeys = createQueryKeys('marketplace-connections')
export const shopeeShopKeys = createQueryKeys('shopee-shops')
export const shopeeWebhookLogKeys = createQueryKeys('shopee-webhook-logs')
export const tikTokShopKeys = createQueryKeys('tiktok-shops')
export const tikTokWebhookLogKeys = createQueryKeys('tiktok-webhook-logs')
