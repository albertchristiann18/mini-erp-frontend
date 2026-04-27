export type POStatus = 'DRAFT' | 'ORDERED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'

export interface PurchaseOrderDetail {
  id: string
  product_variant: string
  product_variant_name: string
  ordered_qty: number
  received_qty: number | null
  unit_price_foreign: number | null
  unit_price_base: number | null
  discounted_unit_price_foreign: number | null
  discounted_unit_price_base: number | null
  total_price_base: number | null
  discounted_total_price_base: number | null
  remarks: string
}

export interface PurchaseOrder {
  id: string
  company: string
  warehouse: string
  warehouse_name: string
  purchase_order_number: string
  status: POStatus
  supplier_name: string
  invoice_number: string
  invoice_date: string | null
  exchange_rate: number | null
  delivery_fee: number | null
  shipping_fee: number | null
  total_ordered_qty: number
  total_received_qty: number
  total_amount: number
  order_details: PurchaseOrderDetail[]
  cdate: string
  udate: string
}
