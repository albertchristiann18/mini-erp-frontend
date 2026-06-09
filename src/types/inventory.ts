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
  category_id: string
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
  supplier_link: string | null
  master_category_key: string | null
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
  product_supplier_link: string | null
  product_photo_url: string | null
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
  product_supplier_link: string | null
  product_photo_url: string | null
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

export interface InventorySummaryVariant {
  variant_id: string
  sku_variant_code: string
  variant_name: string
  variant_values: Record<string, string>
  total_qty: number
  warehouse_stocks: Record<string, number>
  current_cogs: number
  base_price: number
}

export interface InventorySummaryProduct {
  product_id: string
  product_name: string
  sku_code: string
  photo_url: string | null
  variants: InventorySummaryVariant[]
}

export interface InventorySummaryWarehouse {
  id: string
  name: string
}

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  country: string | null
  notes: string | null
  supplier_link: string | null
  is_active: boolean
  company_id: string
  cdate: string
  udate: string
}

export interface ProductVariantSupplier {
  id: string
  supplier_id: string
  supplier_name: string
  supplier_link: string | null
  is_primary: boolean
  notes: string | null
  cdate: string
  udate: string
}

export interface InventorySummaryResponse {
  warehouses: InventorySummaryWarehouse[]
  products: InventorySummaryProduct[]
  summary: {
    total_cogs_stock: number
    total_selling_price: number
    total_products: number
    total_variants: number
  }
}
