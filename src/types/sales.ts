export type SOStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED'
export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'REJECTED'

export interface SalesOrderItem {
  id: string
  product_variant: string
  product_variant_name: string
  quantity: number
  selling_price: number
  discount_amount: number
  commission_fee: number
  service_fee: number
  line_total: number
  total_marketplace_fee: number
  actual_cogs_per_unit: number
  actual_cogs_total: number
}

export interface SalesOrder {
  id: string
  order_number: string
  marketplace: string
  marketplace_order_id: string
  marketplace_order_number: string
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED'
  source_platform: 'SHOPEE' | 'TIKTOK' | 'MANUAL'
  warehouse: string
  warehouse_name: string
  customer_name: string
  customer_phone: string
  shipping_address: string
  shipping_province: string
  shipping_city: string
  order_date: string
  courier_name: string
  tracking_number: string
  shipping_fee: number
  shipping_fee_seller: number
  subtotal: number
  total_discount: number
  total_marketplace_fee: number
  total_cogs: number
  net_revenue: number
  gross_profit: number
  note: string
  cdate: string
  udate: string
}

export interface SalesReturnItem {
  id: string
  product_variant: string
  product_variant_name: string
  quantity: number
  reversed_cogs_total: number
}

export interface SalesReturn {
  id: string
  sales_order: string
  return_number: string
  status: ReturnStatus
  reason: string
  return_date: string | null
  items: SalesReturnItem[]
  cdate: string
}
