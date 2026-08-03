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

// Excel import types — shared so api/ and hooks/ layers can reference them

export interface ExcelImportSkuMapping {
  shopee_sku: string
  variant_id: string
}

export interface ExcelImportPreviewNewOrder {
  order_number: string
  mapped_status: string
  item_count: number
  order_date: string
}

export interface ExcelImportPreviewStatusUpdate {
  order_number: string
  current_status: string
  new_status: string
}

export interface ExcelImportPreviewCancellation {
  order_number: string
  current_status: string
}

export interface ExcelImportUnmatchedSku {
  shopee_sku: string
  product_name: string
  order_number: string
}

export interface ExcelImportPreviewFileSummary {
  total_rows: number
  date_from: string | null
  date_to: string | null
}

export interface ExcelImportPreviewResponse {
  file_summary: ExcelImportPreviewFileSummary
  new_orders: ExcelImportPreviewNewOrder[]
  status_updates: ExcelImportPreviewStatusUpdate[]
  cancellation_transitions: ExcelImportPreviewCancellation[]
  skipped_already_cancelled: number
  unmatched_skus: ExcelImportUnmatchedSku[]
}

export interface ExcelImportErrorItem {
  order_number: string
  reason: string
}

export interface ExcelImportConfirmResponse {
  created: number
  updated: number
  skipped_cancelled: number
  skipped_unmatched: number
  stock_deducted_orders: number
  returns_queued: number
  errors: ExcelImportErrorItem[]
}
