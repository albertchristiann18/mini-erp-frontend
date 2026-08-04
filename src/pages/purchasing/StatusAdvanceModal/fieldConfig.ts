import { HEADER_FIELD_CONFIG } from "../PurchaseOrderDetail/headerFieldConfig"

export type FieldConfig = {
  field: string
  label: string
  section: string
  inputType: "text" | "number" | "date" | "file" | "select"
  suffix?: string
  step?: string
  options?: { value: string; label: string }[]
}

export const REQUIRED_FIELDS: Record<string, FieldConfig[]> = {
  ORDERED: [
    { field: "supplier_name",               label: "Supplier",            section: "General",          inputType: "text" },
    { field: "forwarder_name",              label: "Forwarder",           section: "General",          inputType: "text" },
    { field: "shop_services",               label: "Jasa Belanja",        section: "General",          inputType: "text" },
    { field: "currency",                    label: "Currency",            section: "Financial Setup",  inputType: "select", options: HEADER_FIELD_CONFIG.currency.options },
    { field: "exchange_rate",               label: "Exchange Rate",       section: "Financial Setup",  inputType: "number", step: "0.001" },
    { field: "commission_fee_pct",          label: "Commission %",        section: "Financial Setup",  inputType: "number" },
    { field: "delivery_fee",               label: "Delivery Fee (RMB)",  section: "Financial Setup",  inputType: "number", step: "0.001" },
    { field: "invoice_number",              label: "Invoice Number",      section: "Logistics & Dates", inputType: "text" },
    { field: "invoice_date",                label: "Invoice Date",        section: "Logistics & Dates", inputType: "date" },
    { field: "purchase_order_invoice_file", label: "PO Invoice File",    section: "Attachments",       inputType: "file" },
    { field: "order_details",               label: "Order Items",         section: "Order Items",       inputType: "text" },
  ],
  SHIPPED: [
    { field: "delivery_order_number", label: "Delivery Order No.",  section: "Logistics & Dates", inputType: "text" },
    { field: "cbm",                   label: "CBM",                 section: "Logistics & Dates", inputType: "number", step: "0.001", suffix: "m³" },
    { field: "weight",                label: "Weight",              section: "Logistics & Dates", inputType: "number", step: "0.01",  suffix: "kg" },
    { field: "shipping_fee_per_cbm",  label: "Shipping Fee / CBM",  section: "Financial Setup",   inputType: "number" },
    { field: "delivery_order_file",   label: "Delivery Order File", section: "Attachments",        inputType: "file" },
  ],
  DELIVERED: [
    { field: "delivery_order_invoice_file", label: "DO Invoice File", section: "Attachments", inputType: "file" },
  ],
  COMPLETED: [],
}
