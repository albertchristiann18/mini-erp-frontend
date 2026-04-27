export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ShopeeShop {
  id: string
  shop_id: number
  shop_name: string
  partner_id: number
  access_token: string
  refresh_token: string
  token_expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateShopPayload {
  shop_name: string
  shop_id: number
  partner_id: number
  partner_key: string
  access_token: string
  refresh_token: string
  token_expires_at?: string | null
}

export interface ShopeeWebhookLog {
  id: string
  shop: string
  event_type: number
  payload: Record<string, unknown>
  processed: boolean
  error_message: string | null
  created_at: string
}
