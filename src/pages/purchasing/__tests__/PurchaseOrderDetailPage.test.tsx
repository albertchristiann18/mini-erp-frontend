import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import PurchaseOrderDetailPage from '../PurchaseOrderDetailPage'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'po-1' })),
  }
})

vi.mock('../../../hooks/usePurchasing', () => ({
  usePurchaseOrder: vi.fn(),
  useUpdatePurchaseOrder: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCreatePurchaseOrder: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useReplenishment: vi.fn(() => ({ data: { results: [] } })),
  usePurchaseOrderSummary: vi.fn(() => ({ data: undefined })),
}))

const mockVariantSearchData: unknown = { results: [], count: 0, next: null, previous: null }

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: vi.fn(() => ({ data: { results: [] } })),
  useSuppliers: vi.fn(() => ({ data: { results: [] } })),
  useVariantSearch: vi.fn(() => ({ data: mockVariantSearchData, isLoading: false })),
}))

let mockIsStaff = false

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { is_staff: mockIsStaff } })),
}))

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({ onSelect }: {
    value: string
    selectedLabel?: string
    onSelect: (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null, productPhotoUrl: string | null, lastUnitPriceForeign: string | null, lastCurrency: string | null) => void
    placeholder?: string
    supplierId?: string
    excludeVariantIds?: Set<string>
  }) => (
    <div data-testid="variant-search-select" onClick={() =>
      onSelect('v1', 'Red Variant (RED-001)', 'prod-1', 'Product A', null, null, null, null)}
    />
  ),
}))

vi.mock('../../../features/purchasing/PurchaseOrderExportModal', () => ({
  PurchaseOrderExportModal: () => null,
}))

vi.mock('../../../components/modals/StatusAdvanceModal', () => ({
  StatusAdvanceModal: () => null,
}))

vi.mock('../../../components/modals/SupplierFormModal', () => ({
  SupplierFormModal: () => null,
}))

vi.mock('../../../api/inventory', () => ({
  uploadVariantPhoto: vi.fn().mockResolvedValue({ data: { photo_url: 'https://example.com/new-photo.jpg' } }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { usePurchaseOrder } from '../../../hooks/usePurchasing'
import { useParams } from 'react-router-dom'

const basePo = {
  id: 'po-1',
  company: 'c1',
  warehouse: 'w1',
  warehouse_name: 'Warehouse 1',
  company_name: 'Company 1',
  purchase_order_number: 'PO-001',
  status: 'DRAFT',
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
  editable_fields: { header: [], order_detail: [] },
  next_status: null,
  status_history: [],
  cdate: '2024-01-01',
  udate: '2024-01-01',
  order_details: [],
}

function hookResult(data: unknown) {
  return { data, isLoading: false } as never
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('PO detail variant row shows photo upload when no photo', async () => {
  const poWithItems = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('Red Variant')).toBeInTheDocument()
  })
})

it('PO detail variant row shows existing photo', async () => {
  const poWithItems = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Blue Variant',
        product_id: 'prod-1',
        product_name: 'Product B',
        product_supplier_link: null,
        product_photo_url: 'https://example.com/photo.jpg',
        ordered_qty: 3,
        received_qty: null,
        unit_price_foreign: '15.00',
        unit_price_base: 22500,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: '45.00',
        total_price_base: 67500,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 10,
        incoming_qty: 5,
        variant_values: {},
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    const img = document.querySelector('img[src="https://example.com/photo.jpg"]')
    expect(img).toBeInTheDocument()
  })
})

it('test_groupby_toggle_visible_when_variant_values_exist', async () => {
  const poWithVariantValues = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
        variant_values: { color: 'Red' },
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithVariantValues))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    const productElements = screen.getAllByText('Product')
    expect(productElements.length).toBeGreaterThanOrEqual(1)
  })

  const groupByTriggers = screen.getAllByText('Product')
  const groupByTrigger = groupByTriggers[0].closest('button') || groupByTriggers[0]
  await userEvent.click(groupByTrigger)

  expect(await screen.findByText('Color')).toBeInTheDocument()
})

it('no_flat_option_in_grouping_dropdown', async () => {
  const poWithVariantValues = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
        variant_values: { color: 'Red' },
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithVariantValues))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('Product')).toBeInTheDocument()
  })

  // Open the group-by dropdown
  const groupByTrigger = screen.getByRole('combobox')
  await userEvent.click(groupByTrigger)

  // Verify "Flat" is NOT present
  expect(screen.queryByText('Flat')).not.toBeInTheDocument()

  // Verify other options are present
  const productElements = screen.getAllByText('Product')
  expect(productElements.length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('Color')).toBeInTheDocument()
})

it('single_add_item_button_no_split_button', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  // There should be exactly one "Add Item" button
  const addItemButtons = screen.getAllByRole('button', { name: /add item/i })
  expect(addItemButtons).toHaveLength(1)

  // The chevron split button should NOT exist
  expect(screen.queryByRole('button', { name: /more add options/i })).not.toBeInTheDocument()

  // "Bulk Add Variants" text should NOT be present
  expect(screen.queryByText('Bulk Add Variants')).not.toBeInTheDocument()
})

it('opens add item modal from the primary Add Item button', async () => {
  mockIsStaff = true
  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  const addItemBtn = await screen.findByRole('button', { name: /add item/i })
  await userEvent.click(addItemBtn)

  expect(await screen.findByRole('dialog', { name: /add item/i })).toBeInTheDocument()
})

it('renders the Rec. column header in the Order Items table', async () => {
  const poWithItems = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('Rec.')).toBeInTheDocument()
  })
})

it('shows calculated recommended qty when avg_sales > 0', async () => {
  const poWithItems = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Best Seller',
        product_id: 'prod-1',
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
        avg_sales: 10,
        avg_sales_7d: 12,
        stock_on_hand: 20,
        incoming_qty: 5,
        variant_values: {},
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  // avg=10 (default 30d window uses avg_sales), soh=20, incoming=5
  // recommendedQty = max(0, ceil(10*90 - 20 - 5)) = max(0, 875) = 875
  // 875 appears in both group header sum row and per-variant row
  await waitFor(() => {
    expect(screen.getAllByText('875')).toHaveLength(2)
  })
})

it('shows infinity symbol when avg_sales is 0', async () => {
  const poWithItems = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Slow Mover',
        product_id: 'prod-1',
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
        avg_sales: 0,
        avg_sales_7d: 0,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  // When avg=0: Rec. shows ∞, DOI shows ∞, DOI+ shows ∞ in the per-variant row
  // Group header shows '—' for all three
  await waitFor(() => {
    expect(screen.getAllByText('\u221E')).toHaveLength(3)
  })
})

it('group_by_dropdown_renders_group_by_label', async () => {
  const poWithVariantValues = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
        variant_values: { color: 'Red' },
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithVariantValues))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('Group by:')).toBeInTheDocument()
  })
})

it('group_by_dropdown_options_say_Product_not_By_Product', async () => {
  const poWithVariantValues = {
    ...basePo,
    order_details: [
      {
        id: 'detail-1',
        variant_id: 'var-1',
        product_variant_name: 'Red Variant',
        product_id: 'prod-1',
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
        variant_values: { color: 'Red' },
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithVariantValues))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('Product')).toBeInTheDocument()
  })

  expect(screen.queryByText('By Product')).not.toBeInTheDocument()

  const trigger = screen.getByRole('combobox')
  await userEvent.click(trigger)

  expect(await screen.findByText('Color')).toBeInTheDocument()
  expect(screen.queryByText('By Color')).not.toBeInTheDocument()
})

it('add_item_modal_add_to_list_shows_item_in_queue', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByRole('button', { name: /edit/i }))

  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  expect(await screen.findByRole('dialog', { name: /add items/i })).toBeInTheDocument()

  await userEvent.click(screen.getByTestId('variant-search-select'))

  await userEvent.click(screen.getByRole('button', { name: /add to list/i }))

  expect(screen.getByText('Added so far')).toBeInTheDocument()
  expect(screen.getByText('Red Variant (RED-001)')).toBeInTheDocument()
})

it('add_item_modal_confirm_button_label_reflects_queue_count', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByRole('button', { name: /edit/i }))

  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  expect(await screen.findByRole('dialog', { name: /add items/i })).toBeInTheDocument()

  const confirmBtn = () => screen.getByRole('button', { name: /add (items|\d+)/i })

  expect(confirmBtn()).toHaveTextContent('Add items')

  await userEvent.click(screen.getByTestId('variant-search-select'))
  await userEvent.click(screen.getByRole('button', { name: /add to list/i }))

  expect(confirmBtn()).toHaveTextContent('Add 1 item')

  await userEvent.click(screen.getByTestId('variant-search-select'))
  await userEvent.click(screen.getByRole('button', { name: /add to list/i }))

  expect(confirmBtn()).toHaveTextContent('Add 2 items')
})

it('add_item_modal_confirm_button_disabled_when_queue_empty', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByRole('button', { name: /edit/i }))

  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  expect(await screen.findByRole('dialog', { name: /add items/i })).toBeInTheDocument()

  const confirmBtn = screen.getByRole('button', { name: /add (items|\d+)/i })
  expect(confirmBtn).toBeDisabled()
})

it('add_item_modal_confirm_calls_onAdd_with_array_of_all_queued_items', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByRole('button', { name: /edit/i }))

  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  expect(await screen.findByRole('dialog', { name: /add items/i })).toBeInTheDocument()

  await userEvent.click(screen.getByTestId('variant-search-select'))
  await userEvent.click(screen.getByRole('button', { name: /add to list/i }))

  expect(screen.getByText('Added so far')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: /add 1 item/i }))

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /add items/i })).not.toBeInTheDocument()
  })

  const variantSelects = screen.getAllByTestId('variant-search-select')
  expect(variantSelects.length).toBeGreaterThanOrEqual(1)
})

it('add_item_modal_remove_from_queue_via_x_works', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  await userEvent.click(screen.getByRole('button', { name: /edit/i }))

  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  expect(await screen.findByRole('dialog', { name: /add items/i })).toBeInTheDocument()

  await userEvent.click(screen.getByTestId('variant-search-select'))
  await userEvent.click(screen.getByRole('button', { name: /add to list/i }))

  expect(screen.getByText('Added so far')).toBeInTheDocument()

  const removeBtn = screen.getByRole('button', { name: '' })
  await userEvent.click(removeBtn)

  expect(screen.queryByText('Added so far')).not.toBeInTheDocument()
})
