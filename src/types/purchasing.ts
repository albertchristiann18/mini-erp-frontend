export type POStatus = 'DRAFT' | 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

export interface StatusHistoryItem {
  id: string
  from_status: POStatus
  to_status: POStatus
  changed_by_name: string | null
  note: string | null
  cdate: string
}

export interface PurchaseOrderDetail {
  id: string
  variant_id: string
  product_variant_name: string
  sku_variant_code?: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  ordered_qty: number
  received_qty: number | null
  unit_price_foreign: string | null
  unit_price_base: number | null
  discounted_unit_price_foreign: string | null
  discounted_unit_price_base: number | null
  total_price_foreign: string | null
  total_price_base: number | null
  discounted_total_price_foreign: string | null
  discounted_total_price_base: number | null
  remarks: string
  avg_sales: string | null
  avg_sales_7d: string | null
  stock_on_hand: number
  incoming_qty: number
  variant_values: Record<string, string>
  last_unit_price_foreign: string | null
  last_currency: string | null
  last_discounted_unit_price_foreign: string | null
  shipping_per_unit_idr: number | null
  delivery_per_unit_idr: number | null
  commission_per_unit_idr: number | null
  cogs_per_unit_idr: number | null
  product_has_dimensions: boolean | null
  sourcing_item_id: string | null
  is_draft: boolean
  draft_product_name: string
}

export interface PurchaseOrder {
  id: string
  company: string
  warehouse: string
  warehouse_name: string
  company_name: string
  purchase_order_number: string
  status: POStatus
  supplier_name: string | null
  supplier_id: string | null
  forwarder_name: string | null
  shop_services: string | null
  commission_fee_pct: number | null
  commission_fee: number | null
  commission_fee_rmb: string | null
  delivery_fee: string | null
  delivery_fee_idr: number | null
  currency: string | null
  exchange_rate: string | null
  cbm: string | null
  weight: string | null
  shipping_fee_per_cbm: number | null
  shipping_fee: number | null
  total_ordered_qty: number
  total_received_qty: number
  total_item_amount: number | null
  total_order_amount: number | null
  total_amount: number
  procure_amount: number | null
  refund_amount: number | null
  cost_ratio_cogs: number
  shipping_per_qty: number
  invoice_number: string | null
  invoice_date: string | null
  delivery_order_number: string | null
  delivery_date: string | null
  forecast_delivery_date: string | null
  forecast_cbm: string | null
  forecast_shipping_fee: number | null
  forecast_shipping_fee_per_cbm: number | null
  purchase_order_invoice_file: string | null
  delivery_order_file: string | null
  delivery_order_invoice_file: string | null
  packing_list_file: string | null
  note: string | null
  has_discount: boolean
  editable_fields: {
    header: string[]
    order_detail: string[]
  }
  next_status: POStatus | null
  status_history: StatusHistoryItem[]
  order_details?: PurchaseOrderDetail[]
  cdate: string
  udate: string
}

export interface PurchaseOrderSummary {
  upcoming_count: number
  upcoming_total_amount: number
  upcoming_total_item_amount: number
  upcoming_procure_amount: number
}

export interface TransitionMissingField {
  field: string
  label: string
  section: string
  message: string
}

export interface TransitionWarning {
  type: string
  message: string
  items?: { name: string; ordered_qty: number; received_qty: number }[]
}

export interface TransitionCheckResult {
  can_transition: boolean
  target_status: POStatus
  missing_fields: TransitionMissingField[]
  warnings: TransitionWarning[]
  error?: string
}

export interface ReplenishmentItem {
  variant_id: string
  sku_variant_code: string
  variant_name: string
  product_name: string
  stock_on_hand: number
  incoming_qty: number
  avg_sales_7d: number
  avg_sales_14d: number
  avg_sales_30d: number
}

export interface SourcingPoolItem {
  id: string
  product_name: string
  variant_name: string
  category_id: string | null
  category_name: string | null
  category_code: string | null
  unit_price: string
  discounted_price: string | null
  qty_suggested: number | null
  supplier_link: string | null
  image_url: string | null
  image_proxy_url: string | null
  image_download_status: 'PENDING' | 'DONE' | 'FAILED'
  notes: string | null
  times_ordered: number
  cdate: string
  udate: string
  variant_id: string | null
  variant_code: string | null
}

export interface SourcingPoolItemsResponse {
  pool_id: string | null
  count?: number
  next?: string | null
  previous?: string | null
  results?: SourcingPoolItem[]
  items?: SourcingPoolItem[]
}

export interface SourcingPoolPreviewRow {
  product_name: string
  variant_name: string
  unit_price: number | string
  discounted_price?: number | string | null
  qty_suggested?: number | null
  category_code?: string
  supplier_link?: string | null
  image_url?: string | null
  notes?: string | null
  [key: string]: unknown
}

export interface SourcingPoolPreviewError {
  row?: number
  message?: string
  errors?: string[]
  [key: string]: unknown
}

export interface SourcingPoolPreviewResult {
  valid: SourcingPoolPreviewRow[]
  errors: SourcingPoolPreviewError[]
}

export interface SourcingPoolImportResult {
  created: number
  updated: number
  pool_id: string
}

export interface DraftPoolLine {
  sourcing_item_id: string
  product_name: string
  variant_name: string
  ordered_qty: number
  unit_price_foreign: number
  image_proxy_url: string | null
  variant_id: string | null
}
