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
  company: string
  warehouse: string
  marketplace: string | null
  marketplace_name: string | null
  order_number: string
  status: SOStatus
  channel: string
  subtotal: number
  total_discount: number
  total_marketplace_fee: number
  shipping_fee_seller: number
  total_cogs: number
  net_revenue: number
  gross_profit: number
  order_date: string
  confirmed_date: string | null
  shipped_date: string | null
  delivered_date: string | null
  completed_date: string | null
  items: SalesOrderItem[]
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
