import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, it, expect } from 'vitest'

vi.mock('../PurchaseOrderExportPDF', () => ({
  default: ({ subGroups }: { subGroups?: Array<unknown> }) => (
    <div data-testid="pdf-content" data-subgroup-count={subGroups?.length ?? 0}>
      {subGroups?.length ?? 0} sub-groups
    </div>
  ),
}))

vi.mock('../purchaseOrderPDFUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../purchaseOrderPDFUtils')>()
  return {
    ...actual,
    fetchPhotoViaProxy: vi.fn().mockResolvedValue(null),
  }
})

import { PurchaseOrderExportModal } from '../PurchaseOrderExportModal'
import type { PurchaseOrder } from '../../../types/purchasing'

const basePo: PurchaseOrder = {
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
  total_ordered_qty: 6,
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
  order_details: [
    {
      id: 'd1', variant_id: 'v1', product_variant_name: 'L / Orange Clam',
      product_id: 'p1', product_name: 'Lisa Swimwear',
      product_supplier_link: null, product_photo_url: null,
      ordered_qty: 2, received_qty: null,
      unit_price_foreign: '10.00', unit_price_base: 15000,
      discounted_unit_price_foreign: null, discounted_unit_price_base: null,
      total_price_foreign: '20.00', total_price_base: 30000,
      discounted_total_price_foreign: null, discounted_total_price_base: null,
      remarks: '', avg_sales: null, avg_sales_7d: null,
      stock_on_hand: 0, incoming_qty: 0,
      variant_values: { Color: 'Orange Clam', Size: 'L' },
      last_unit_price_foreign: null, last_currency: null,
      last_discounted_unit_price_foreign: null,
      shipping_per_unit_idr: null, delivery_per_unit_idr: null,
      commission_per_unit_idr: null, cogs_per_unit_idr: null,
      product_has_dimensions: null,
    },
    {
      id: 'd2', variant_id: 'v2', product_variant_name: 'L / White Cherry',
      product_id: 'p1', product_name: 'Lisa Swimwear',
      product_supplier_link: null, product_photo_url: null,
      ordered_qty: 2, received_qty: null,
      unit_price_foreign: '10.00', unit_price_base: 15000,
      discounted_unit_price_foreign: null, discounted_unit_price_base: null,
      total_price_foreign: '20.00', total_price_base: 30000,
      discounted_total_price_foreign: null, discounted_total_price_base: null,
      remarks: '', avg_sales: null, avg_sales_7d: null,
      stock_on_hand: 0, incoming_qty: 0,
      variant_values: { Color: 'White Cherry', Size: 'L' },
      last_unit_price_foreign: null, last_currency: null,
      last_discounted_unit_price_foreign: null,
      shipping_per_unit_idr: null, delivery_per_unit_idr: null,
      commission_per_unit_idr: null, cogs_per_unit_idr: null,
      product_has_dimensions: null,
    },
    {
      id: 'd3', variant_id: 'v3', product_variant_name: 'L / Red',
      product_id: 'p2', product_name: 'Product B',
      product_supplier_link: null, product_photo_url: null,
      ordered_qty: 2, received_qty: null,
      unit_price_foreign: '8.00', unit_price_base: 12000,
      discounted_unit_price_foreign: null, discounted_unit_price_base: null,
      total_price_foreign: '16.00', total_price_base: 24000,
      discounted_total_price_foreign: null, discounted_total_price_base: null,
      remarks: '', avg_sales: null, avg_sales_7d: null,
      stock_on_hand: 0, incoming_qty: 0,
      variant_values: { Color: 'Red', Size: 'L' },
      last_unit_price_foreign: null, last_currency: null,
      last_discounted_unit_price_foreign: null,
      shipping_per_unit_idr: null, delivery_per_unit_idr: null,
      commission_per_unit_idr: null, cogs_per_unit_idr: null,
      product_has_dimensions: null,
    },
  ],
}

it('export modal sidebar shows all products and sub-groups with item counts', async () => {
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  expect(screen.getByText('Lisa Swimwear')).toBeInTheDocument()
  expect(screen.getByText('Product B')).toBeInTheDocument()
  expect(screen.getByText(/Orange Clam.*\(1\)/)).toBeInTheDocument()
  expect(screen.getByText(/White Cherry.*\(1\)/)).toBeInTheDocument()
  expect(screen.getByText(/Red.*\(1\)/)).toBeInTheDocument()
})

it('export modal renders all sub-groups selected by default', async () => {
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(5)
  checkboxes.forEach(cb => expect(cb).toBeChecked())
})

it('unchecking a sub-group checkbox reduces filteredSubGroups passed to PDF', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const orangeClamCheckbox = screen.getByRole('checkbox', { name: /Orange Clam/i })
  await user.click(orangeClamCheckbox)
  expect(orangeClamCheckbox).not.toBeChecked()

  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '2')
})

it('unchecking a product checkbox deselects all its sub-groups', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const lisaCheckbox = screen.getByRole('checkbox', { name: /Lisa Swimwear/i })
  await user.click(lisaCheckbox)

  expect(lisaCheckbox).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: /Orange Clam/i })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: /White Cherry/i })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: /Red/i })).toBeChecked()

  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '1')
})

it('re-checking a product checkbox restores all its sub-groups', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const lisaCheckbox = screen.getByRole('checkbox', { name: /Lisa Swimwear/i })
  await user.click(lisaCheckbox)
  await user.click(lisaCheckbox)

  expect(lisaCheckbox).toBeChecked()
  expect(screen.getByRole('checkbox', { name: /Orange Clam/i })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: /White Cherry/i })).toBeChecked()

  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '3')
})

it('product checkbox is indeterminate when only some sub-groups are selected', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  // Uncheck one sub-group of Lisa Swimwear (which has 2 sub-groups: Orange Clam, White Cherry)
  const orangeClamCheckbox = screen.getByRole('checkbox', { name: /Orange Clam/i })
  await user.click(orangeClamCheckbox)

  const lisaCheckbox = screen.getByRole('checkbox', { name: /Lisa Swimwear/i })
  // indeterminate is a DOM property, not an attribute — check via element property
  expect((lisaCheckbox as HTMLInputElement).indeterminate).toBe(true)
  expect(lisaCheckbox).not.toBeChecked()
})
