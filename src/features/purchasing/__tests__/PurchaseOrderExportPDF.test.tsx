import { render, screen } from '@testing-library/react'
import { vi, it, expect } from 'vitest'

vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-page">{children}</div>,
  View: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-view">{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span data-testid="pdf-text">{children}</span>,
  Image: ({ src }: { src: string }) => (
    <img src={src} alt="" data-testid="pdf-image" />
  ),
  Link: ({ children, src }: { children: React.ReactNode; src?: string }) => (
    <a href={src} data-testid="pdf-link">{children}</a>
  ),
  StyleSheet: { create: () => ({}) },
  PDFViewer: ({ children }: { children: React.ReactNode }) => <div data-testid="pdf-viewer">{children}</div>,
  pdf: () => ({ toBlob: () => new Blob() }),
}))

import PurchaseOrderExportPDF, { groupByProduct } from '../PurchaseOrderExportPDF'
import type { PurchaseOrder } from '../../../types/purchasing'

const mockPo = {
  id: 'po-1',
  company: 'c1',
  warehouse: 'w1',
  warehouse_name: 'Warehouse 1',
  company_name: 'Company 1',
  purchase_order_number: 'PO-001',
  status: 'ORDERED',
  supplier_name: 'Supplier A',
  supplier_id: null,
  forwarder_name: null,
  shop_services: null,
  commission_fee_pct: null,
  commission_fee: null,
  commission_fee_rmb: null,
  delivery_fee: null,
  delivery_fee_idr: null,
  currency: 'CNY',
  exchange_rate: '1500',
  cbm: null,
  weight: null,
  shipping_fee_per_cbm: null,
  shipping_fee: null,
  total_ordered_qty: 10,
  total_received_qty: 0,
  total_item_amount: null,
  total_order_amount: null,
  total_amount: 0,
  procure_amount: null,
  refund_amount: null,
  cost_ratio_cogs: 0,
  shipping_per_qty: 0,
  invoice_number: null,
  invoice_date: null,
  delivery_order_number: null,
  delivery_date: null,
  forecast_delivery_date: null,
  forecast_cbm: null,
  forecast_shipping_fee: null,
  forecast_shipping_fee_per_cbm: null,
  purchase_order_invoice_file: null,
  delivery_order_file: null,
  delivery_order_invoice_file: null,
  packing_list_file: null,
  note: null,
  has_discount: false,
  editable_fields: { header: [], order_detail: [] },
  next_status: null,
  status_history: [],
  cdate: '2024-01-01',
  udate: '2024-01-01',
  order_details: [],
}

it('PO export shows supplier link when available', () => {
  const poWithSupplierLink = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'Red Variant',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: 'https://supplier.example.com/product-a',
        product_photo_url: null,
        ordered_qty: 5,
        received_qty: null,
        unit_price_foreign: '10.00',
        unit_price_base: 15000,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '50.00',
        total_price_base: 75000,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_unit_price_foreign: null,
        last_currency: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
      },
    ],
  } satisfies PurchaseOrder

  render(<PurchaseOrderExportPDF po={poWithSupplierLink} />)

  const links = screen.getAllByTestId('pdf-link')
  expect(links.length).toBeGreaterThan(0)
  const supplierLink = links.find(l => l.getAttribute('href') === 'https://supplier.example.com/product-a')
  expect(supplierLink).toBeInTheDocument()
})

it('PO export shows image placeholder when no photo', () => {
  const poWithoutPhoto = {
    ...mockPo,
    status: 'ORDERED' as const,
    order_details: [
      {
        id: 'd1',
        variant_id: 'v1',
        product_variant_name: 'Red Variant',
        product_id: 'p1',
        product_name: 'Product A',
        product_supplier_link: null,
        product_photo_url: null,
        ordered_qty: 5,
        received_qty: null,
        unit_price_foreign: '10.00',
        unit_price_base: 15000,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '50.00',
        total_price_base: 75000,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_unit_price_foreign: null,
        last_currency: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
      },
    ],
  } satisfies PurchaseOrder

  render(<PurchaseOrderExportPDF po={poWithoutPhoto} />)

  const images = screen.queryAllByTestId('pdf-image')
  expect(images.length).toBe(0)
})

it('groupByProduct sets product_name correctly', () => {
  const details = [
    {
      id: 'd1',
      variant_id: 'v1',
      product_variant_name: 'Red',
      product_id: 'p1',
      product_name: 'Product A',
      product_supplier_link: null,
      product_photo_url: null,
      ordered_qty: 5,
      received_qty: null,
      unit_price_foreign: '10.00',
      unit_price_base: 15000,
      discounted_unit_price_foreign: null,
      discounted_unit_price_base: null,
      total_price_foreign: '50.00',
      total_price_base: 75000,
      discounted_total_price_foreign: null,
      discounted_total_price_base: null,
      remarks: '',
      avg_sales: null,
      avg_sales_7d: null,
      stock_on_hand: 20,
      incoming_qty: 0,
      variant_values: {},
      last_unit_price_foreign: null,
      last_currency: null,
      shipping_per_unit_idr: null,
      delivery_per_unit_idr: null,
      commission_per_unit_idr: null,
      cogs_per_unit_idr: null,
      product_has_dimensions: null,
    },
    {
      id: 'd2',
      variant_id: 'v2',
      product_variant_name: 'Blue',
      product_id: 'p1',
      product_name: 'Product A',
      product_supplier_link: null,
      product_photo_url: null,
      ordered_qty: 3,
      received_qty: null,
      unit_price_foreign: '10.00',
      unit_price_base: 15000,
      discounted_unit_price_foreign: null,
      discounted_unit_price_base: null,
      total_price_foreign: '30.00',
      total_price_base: 45000,
      discounted_total_price_foreign: null,
      discounted_total_price_base: null,
      remarks: '',
      avg_sales: null,
      avg_sales_7d: null,
      stock_on_hand: 10,
      incoming_qty: 0,
      variant_values: {},
      last_unit_price_foreign: null,
      last_currency: null,
      shipping_per_unit_idr: null,
      delivery_per_unit_idr: null,
      commission_per_unit_idr: null,
      cogs_per_unit_idr: null,
      product_has_dimensions: null,
    },
  ]
  const groups = groupByProduct(details)
  expect(groups).toHaveLength(1)
  expect(groups[0].product_name).toBe('Product A')
  expect(groups[0].items).toHaveLength(2)
})
