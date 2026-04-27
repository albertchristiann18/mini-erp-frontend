export type MarketplacePlatform = 'SHOPEE' | 'TIKTOK'

export interface MarketplaceConnection {
  id: string
  company: string
  platform: MarketplacePlatform
  display_name: string
  is_active: boolean
  shopee_shop: string | null
  tiktok_shop: string | null
  cdate: string
  udate: string
}

export interface MarketplaceConnectionFormData {
  platform: MarketplacePlatform
  display_name: string
  is_active?: boolean
}
