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
