export interface TikTokShop {
  id: string
  company: string
  shop_id: string
  shop_name: string
  app_key: string
  access_token: string
  refresh_token: string
  token_expires_at: string | null
  is_active: boolean
  warehouse: string | null
  cdate: string
  udate: string
}

export interface TikTokWebhookLog {
  id: string
  shop: string | null
  event_type: string
  payload: Record<string, unknown>
  processed: boolean
  error: string
  cdate: string
}

export interface TikTokShopFormData {
  company: string
  shop_id: string
  shop_name: string
  app_key: string
  app_secret: string
  warehouse?: string
  is_active?: boolean
}
