export interface Category {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  master_category_key?: string
  cdate: string
  udate: string
}

export interface ProductPhoto {
  id: string
  image_url: string | null
  order: number
  is_primary: boolean
}

export interface Product {
  id: string
  company: string
  category: string
  category_name: string
  name: string
  sku_code: string
  description: string
  total_qty: number
  total_cogs: number
  length: number
  width: number
  height: number
  weight: number
  is_active: boolean
  photos?: ProductPhoto[]
  variants?: ProductVariant[]
  cdate: string
  udate: string
}

export interface ProductVariant {
  id: string
  product: string
  product_name: string
  company: string
  name: string
  sku: string
  sku_variant_code: string
  base_price: number
  total_available_qty: number
  total_incoming_qty: number
  is_active: boolean
  marketplace_listings?: Array<{
    marketplace_id: string
    selling_price: number
    discounted_price?: number
    is_active: boolean
  }>
  cdate: string
  udate: string
}

export interface Warehouse {
  id: string
  company: string
  name: string
  address: string
  is_active: boolean
  cdate: string
  udate: string
}

export interface StockMovement {
  id: string
  company: string
  product_variant: string
  product_variant_name: string
  warehouse: string
  warehouse_name: string
  movement_type: 'PURCHASE' | 'INBOUND' | 'OUTBOUND' | 'RETURN' | 'ADJUSTMENT' | 'TRANSFER'
  quantity: number
  balance_before: number
  balance_after: number
  reference_number: string
  note: string
  cdate: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ProductVariantStock {
  id: string
  name: string
  sku_variant_code: string
  product: string
  product_name: string
  product_sku: string
  category_name: string
  base_price: number
  total_available_qty: number
  physical_qty: number
  is_active: boolean
}

export interface AvgSalesVariant {
  variant_id: string
  sku_variant_code: string
  variant_name: string
  avg_sales_per_day: number
  total_qty_sold: number
  days: number
}

export interface AvgSalesResult {
  days: number
  date_from: string
  results: AvgSalesVariant[]
}
