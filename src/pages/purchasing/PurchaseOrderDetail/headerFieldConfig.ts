/** Header field input type configuration for PurchaseOrderDetail. */

export type FieldInputConfig = {
  label: string; inputType: 'text' | 'number' | 'date' | 'file' | 'select'
  step?: string; options?: { value: string; label: string }[]
}

export const HEADER_FIELD_CONFIG: Record<string, FieldInputConfig> = {
  supplier_name: { label: 'Supplier', inputType: 'text' },
  forwarder_name: { label: 'Forwarder', inputType: 'text' },
  shop_services: { label: 'Jasa Belanja', inputType: 'text' },
  currency: { label: 'Currency', inputType: 'select', options: [
    { value: 'CNY', label: 'CNY (¥ Yuan)' }, { value: 'USD', label: 'USD ($ Dollar)' },
    { value: 'EUR', label: 'EUR (€ Euro)' }, { value: 'SGD', label: 'SGD (S$ Singapore)' },
    { value: 'MYR', label: 'MYR (RM Ringgit)' }, { value: 'IDR', label: 'IDR (Rp Rupiah)' },
  ] },
  exchange_rate: { label: 'Exchange Rate', inputType: 'number', step: '0.001' },
  commission_fee_pct: { label: 'Commission %', inputType: 'number' },
  forecast_shipping_fee_per_cbm: { label: 'Forecast Shipping/CBM', inputType: 'number' },
  delivery_fee: { label: 'Delivery Fee (RMB)', inputType: 'number', step: '0.001' },
  commission_fee_rmb: { label: 'Commission (RMB)', inputType: 'number', step: '0.001' },
  invoice_number: { label: 'Invoice No.', inputType: 'text' },
  invoice_date: { label: 'Invoice Date', inputType: 'date' },
  delivery_order_number: { label: 'Delivery Order No.', inputType: 'text' },
  delivery_date: { label: 'Delivery Date', inputType: 'date' },
  forecast_delivery_date: { label: 'Forecast Delivery', inputType: 'date' },
  cbm: { label: 'CBM', inputType: 'number', step: '0.001' },
  forecast_cbm: { label: 'Forecast CBM', inputType: 'number', step: '0.001' },
  weight: { label: 'Weight (kg)', inputType: 'number', step: '0.01' },
  shipping_fee_per_cbm: { label: 'Shipping Fee/CBM', inputType: 'number' },
  forecast_shipping_fee: { label: 'Forecast Shipping', inputType: 'number' },
  purchase_order_invoice_file: { label: 'PO Invoice File', inputType: 'file' },
  delivery_order_file: { label: 'DO File', inputType: 'file' },
  delivery_order_invoice_file: { label: 'DO Invoice File', inputType: 'file' },
  packing_list_file: { label: 'Packing List', inputType: 'file' },
}
