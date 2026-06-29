import type { SourcingPoolItem } from '../../types/purchasing'

export interface PoolGroup {
  product_name: string
  supplier_link: string | null
  image_proxy_url: string | null
  items: SourcingPoolItem[]
}

export interface PoolLineSelection {
  sourcing_item_id: string
  product_name: string
  variant_name: string
  ordered_qty: number
  unit_price_foreign: number
  image_proxy_url: string | null
  variant_id: string | null
}
