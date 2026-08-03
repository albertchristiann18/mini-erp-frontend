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

const mockFetchPhotoViaProxy = vi.fn().mockResolvedValue(null)

vi.mock('../../../hooks/api/usePurchasing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../hooks/api/usePurchasing')>()
  return {
    ...actual,
    useFetchPhotoViaProxy: () => mockFetchPhotoViaProxy,
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
      product_dim1_key: null,
    },
    {
      id: 'd2', variant_id: 'v2', product_variant_name: 'M / White Cherry',
      product_id: 'p1', product_name: 'Lisa Swimwear',
      product_supplier_link: null, product_photo_url: null,
      ordered_qty: 2, received_qty: null,
      unit_price_foreign: '10.00', unit_price_base: 15000,
      discounted_unit_price_foreign: null, discounted_unit_price_base: null,
      total_price_foreign: '20.00', total_price_base: 30000,
      discounted_total_price_foreign: null, discounted_total_price_base: null,
      remarks: '', avg_sales: null, avg_sales_7d: null,
      stock_on_hand: 0, incoming_qty: 0,
      variant_values: { Color: 'White Cherry', Size: 'M' },
      last_unit_price_foreign: null, last_currency: null,
      last_discounted_unit_price_foreign: null,
      shipping_per_unit_idr: null, delivery_per_unit_idr: null,
      commission_per_unit_idr: null, cogs_per_unit_idr: null,
      product_has_dimensions: null,
      product_dim1_key: null,
    },
    {
      id: 'd3', variant_id: 'v3', product_variant_name: 'S / Red',
      product_id: 'p2', product_name: 'Product B',
      product_supplier_link: null, product_photo_url: null,
      ordered_qty: 2, received_qty: null,
      unit_price_foreign: '8.00', unit_price_base: 12000,
      discounted_unit_price_foreign: null, discounted_unit_price_base: null,
      total_price_foreign: '16.00', total_price_base: 24000,
      discounted_total_price_foreign: null, discounted_total_price_base: null,
      remarks: '', avg_sales: null, avg_sales_7d: null,
      stock_on_hand: 0, incoming_qty: 0,
      variant_values: { Color: 'Red', Size: 'S' },
      last_unit_price_foreign: null, last_currency: null,
      last_discounted_unit_price_foreign: null,
      shipping_per_unit_idr: null, delivery_per_unit_idr: null,
      commission_per_unit_idr: null, cogs_per_unit_idr: null,
      product_has_dimensions: null,
      product_dim1_key: null,
    },
  ],
}

it('sidebar shows all products and sub-groups with item counts', async () => {
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  expect(screen.getByText('Lisa Swimwear')).toBeInTheDocument()
  expect(screen.getByText('Product B')).toBeInTheDocument()
  expect(screen.getByText('L (1)')).toBeInTheDocument()
  expect(screen.getByText('M (1)')).toBeInTheDocument()
  expect(screen.getByText('S (1)')).toBeInTheDocument()
})

it('renders all sub-groups selected by default', async () => {
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(5)
  checkboxes.forEach(cb => expect(cb).toBeChecked())
})

it('unchecking a sub-group checkbox reduces filteredSubGroups', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const lCheckbox = screen.getByRole('checkbox', { name: 'L' })
  await user.click(lCheckbox)
  expect(lCheckbox).not.toBeChecked()

  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '2')
})

it('unchecking a product checkbox deselects all its sub-groups', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const lisaCheckbox = screen.getByRole('checkbox', { name: /Lisa Swimwear/i })
  await user.click(lisaCheckbox)

  expect(lisaCheckbox).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'L' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'M' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'S' })).toBeChecked()

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
  expect(screen.getByRole('checkbox', { name: 'L' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'M' })).toBeChecked()

  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '3')
})

it('product checkbox is indeterminate when only some sub-groups are selected', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  // Uncheck one sub-group of Lisa Swimwear (which has 2 sub-groups: L, M)
  const lCheckbox = screen.getByRole('checkbox', { name: 'L' })
  await user.click(lCheckbox)

  const lisaCheckbox = screen.getByRole('checkbox', { name: /Lisa Swimwear/i })
  // indeterminate is a DOM property, not an attribute — check via element property
  expect((lisaCheckbox as HTMLInputElement).indeterminate).toBe(true)
  expect(lisaCheckbox).not.toBeChecked()
})

it('Group by select shows Product only and all dimension keys from PO variant values', async () => {
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  expect(select).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Product only' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Color' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Size' })).toBeInTheDocument()
  // product_dim1_key is null on all details → falls back to second dimension key 'Size'
  expect(select).toHaveValue('Size')
})

it('changing Group by dimension resets selection so all sub-groups are checked', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  // Deselect the 'L' sub-group (exact name match avoids collision with 'Lisa Swimwear')
  const lCheckbox = screen.getByRole('checkbox', { name: 'L' })
  await user.click(lCheckbox)
  expect(lCheckbox).not.toBeChecked()

  // Change grouping to Color
  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  await user.selectOptions(select, 'Color')

  // All checkboxes should now be checked (deselectedKeys reset)
  const allCbs = screen.getAllByRole('checkbox')
  allCbs.forEach(cb => expect(cb).toBeChecked())
})

it('Product only grouping hides sub-group checkboxes showing only product checkboxes', async () => {
  const user = userEvent.setup()
  render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)

  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  await user.selectOptions(select, '')  // empty string = 'Product only'

  // Only 2 product-level checkboxes visible (no sub-group checkboxes)
  const checkboxes = screen.getAllByRole('checkbox')
  expect(checkboxes).toHaveLength(2)
  // PDF receives 2 sub-groups (one per product)
  const pdfContent = await screen.findByTestId('pdf-content')
  expect(pdfContent).toHaveAttribute('data-subgroup-count', '2')
})

it('Group by select for PO with a single dimension key shows only that dimension as option', async () => {
  const singleDimPo: PurchaseOrder = {
    ...basePo,
    order_details: [
      {
        ...basePo.order_details![0],
        variant_values: { Size: 'L' },
        product_variant_name: 'L',
      },
      {
        ...basePo.order_details![1],
        variant_values: { Size: 'M' },
        product_variant_name: 'M',
      },
    ],
  }
  render(<PurchaseOrderExportModal open po={singleDimPo} onClose={() => {}} />)
  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  expect(screen.getByRole('option', { name: 'Product only' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Size' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Color' })).not.toBeInTheDocument()
  // default is first (and only) key = 'Size'
  expect(select).toHaveValue('Size')
})

it('reopening the modal resets selection and group-by key to defaults', async () => {
  const user = userEvent.setup()
  const { rerender } = render(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  // Deselect one sub-group
  await user.click(screen.getByRole('checkbox', { name: 'L' }))
  // Close and reopen
  rerender(<PurchaseOrderExportModal open={false} po={basePo} onClose={() => {}} />)
  rerender(<PurchaseOrderExportModal open po={basePo} onClose={() => {}} />)
  // All checkboxes should be checked again
  screen.getAllByRole('checkbox').forEach(cb => expect(cb).toBeChecked())
  // Group-by should be back to default (Size = second key)
  expect(screen.getByRole('combobox', { name: /group by dimension/i })).toHaveValue('Size')
})

it('Group by selector defaults to product_dim1_key when all details share the same dim1_key', () => {
  const dim1Po: PurchaseOrder = {
    ...basePo,
    order_details: [
      {
        ...basePo.order_details![0],
        variant_values: { Warna: 'Putih', Ukuran: 'S' },
        product_dim1_key: 'Warna',
      },
      {
        ...basePo.order_details![1],
        variant_values: { Warna: 'Merah', Ukuran: 'M' },
        product_dim1_key: 'Warna',
      },
    ],
  }
  render(<PurchaseOrderExportModal open po={dim1Po} onClose={() => {}} />)
  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  // Without dim1_key logic, heuristic would pick 'Ukuran' (index 1).
  // With dim1_key logic, all details share 'Warna' → should default to 'Warna'.
  expect(select).toHaveValue('Warna')
})

it('image fetch calls fetchPhotoViaProxy with groupByKey and dim value for each subgroup', async () => {
  const mockFetch = mockFetchPhotoViaProxy
  const colorPo: PurchaseOrder = {
    ...basePo,
    order_details: [
      {
        ...basePo.order_details![0],
        product_id: 'p1',
        variant_values: { Warna: 'Putih', Ukuran: 'S' },
        product_dim1_key: 'Warna',
      },
      {
        ...basePo.order_details![1],
        product_id: 'p1',
        variant_values: { Warna: 'Merah', Ukuran: 'M' },
        product_dim1_key: 'Warna',
      },
    ],
  }
  render(<PurchaseOrderExportModal open po={colorPo} onClose={() => {}} />)
  // Wait for the effect to fire
  await vi.waitFor(() => {
    expect(mockFetch).toHaveBeenCalledWith('p1', 'Warna', 'Putih')
    expect(mockFetch).toHaveBeenCalledWith('p1', 'Warna', 'Merah')
  })
})

it('Group by selector falls back to second dimension key when details have mixed dim1_keys', () => {
  const mixedPo: PurchaseOrder = {
    ...basePo,
    order_details: [
      {
        ...basePo.order_details![0],
        variant_values: { Color: 'Red', Size: 'S' },
        product_dim1_key: 'Color',
      },
      {
        ...basePo.order_details![1],
        variant_values: { Warna: 'Putih', Ukuran: 'S' },
        product_dim1_key: 'Warna',
      },
    ],
  }
  render(<PurchaseOrderExportModal open po={mixedPo} onClose={() => {}} />)
  const select = screen.getByRole('combobox', { name: /group by dimension/i })
  // Mixed dim1_keys → fallback: second dimension key in union order
  // dimensionKeys = ['Color', 'Size', 'Warna', 'Ukuran'] → second = 'Size'
  expect(select).toHaveValue('Size')
})
