export interface Category {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  cdate: string
  udate: string
}

export interface Category {
  id: string
  company: string
  name: string
  description: string
  is_active: boolean
  cdate: string
  udate: string
}

export interface Product {
  id: string
  company: string
  category: string
  category_name: string
  name: string
  sku: string
  description: string
  length: number
  width: number
  height: number
  weight: number
  is_active: boolean
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
  total_available_qty: number
  total_incoming_qty: number
  is_active: boolean
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
