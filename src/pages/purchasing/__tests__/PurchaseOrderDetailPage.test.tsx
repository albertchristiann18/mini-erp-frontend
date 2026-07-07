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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

let mockPoolBrowserLines: import('../../../types/purchasing').DraftPoolLine[] = []

vi.mock('../../../features/purchasing/components/PoolBrowser', () => ({
  PoolBrowser: ({ onAddLines }: { supplierId: string; newItemKeys: Set<string>; onAddLines: (lines: import('../../../types/purchasing').DraftPoolLine[]) => void }) => (
    <button data-testid="mock-add-pool-lines" onClick={() => onAddLines(mockPoolBrowserLines)}>
      Add Pool Lines
    </button>
  ),
}))

vi.mock('../../../features/purchasing/components/SourcingPoolImportModal', () => ({
  SourcingPoolImportModal: () => null,
}))

vi.mock('../../../features/purchasing/hooks/useSourcingPool', () => ({
  useAddDraftLine: vi.fn(),
}))

import { usePurchaseOrder, useUpdatePurchaseOrder } from '../../../hooks/usePurchasing'
import { useParams } from 'react-router-dom'
import { toast } from '../../../lib/toast'
import { useCreatePurchaseOrder } from '../../../hooks/usePurchasing'
import { useWarehouses, useSuppliers } from '../../../hooks/useInventory'
import { useAddDraftLine } from '../../../features/purchasing/hooks/useSourcingPool'

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

function renderCreatePage() {
  vi.mocked(useParams).mockReturnValue({ id: 'new' })
  vi.mocked(usePurchaseOrder).mockReturnValue({ data: undefined, isLoading: false } as never)
  vi.mocked(useWarehouses).mockReturnValue({
    data: { results: [{ id: 'wh-1', name: 'Warehouse 1' }] },
  } as never)
  vi.mocked(useSuppliers).mockReturnValue({
    data: { results: [{ id: 'sup-1', name: 'Supplier A' }] },
  } as never)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function selectWarehouseAndSupplier() {
  await userEvent.click(screen.getByTestId('warehouse-select-trigger'))
  await userEvent.click(await screen.findByText('Warehouse 1'))
  await userEvent.click(screen.getByTestId('supplier-select-trigger'))
  await userEvent.click(await screen.findByText('Supplier A'))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPoolBrowserLines = []
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

it('renders one empty row on open', async () => {
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
  expect(screen.getByText('1')).toBeInTheDocument()
  expect(screen.getAllByTestId('variant-search-select')).toHaveLength(1)
})

it('bulk price fills all rows', async () => {
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

  // Add a second row first
  await userEvent.click(screen.getByText(/add row/i))
  await waitFor(() => {
    expect(screen.getAllByTestId('variant-search-select')).toHaveLength(2)
  })

  // Type in bulk price
  const [bulkInput] = screen.getAllByPlaceholderText('Apply to all rows')
  await userEvent.clear(bulkInput)
  await userEvent.type(bulkInput, '15.50')

  // Wait a tick for the state update
  await waitFor(() => {
    const priceInputs = screen.getAllByDisplayValue('15.5')
    expect(priceInputs.length).toBeGreaterThanOrEqual(2)
  })
})

it('add row appends a new empty row', async () => {
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
  expect(screen.getAllByTestId('variant-search-select')).toHaveLength(1)

  await userEvent.click(screen.getByText(/add row/i))
  expect(screen.getAllByTestId('variant-search-select')).toHaveLength(2)
})

it('remove row removes a row', async () => {
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

  // Add a second row so remove buttons appear
  await userEvent.click(screen.getByText(/add row/i))
  await waitFor(() => {
    expect(screen.getAllByTestId('variant-search-select')).toHaveLength(2)
  })

  // Click the first remove button
  const removeBtns = screen.getAllByRole('button', { name: '' })
  await userEvent.click(removeBtns[0])

  expect(screen.getAllByTestId('variant-search-select')).toHaveLength(1)
})

it('confirm calls onAdd with only rows that have a variant set', async () => {
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

  // Select a variant in the first row
  await userEvent.click(screen.getByTestId('variant-search-select'))

  // Confirm
  const confirmBtn = screen.getByRole('button', { name: /add 1 item/i })
  await userEvent.click(confirmBtn)

  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /add items/i })).not.toBeInTheDocument()
  })
})

it('confirm button disabled when no rows have variant', async () => {
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

  const confirmBtn = screen.getByRole('button', { name: /add items/i })
  expect(confirmBtn).toBeDisabled()
})

it('resets rows and bulkPrice on reopen', async () => {
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

  // Add a row and type a bulk price
  await userEvent.click(screen.getByText(/add row/i))
  const [bulkPriceInput] = screen.getAllByPlaceholderText('Apply to all rows')
  await userEvent.type(bulkPriceInput, '10')

  // Close dialog
  await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name: /add items/i })).not.toBeInTheDocument()
  })

  // Reopen
  await userEvent.click(await screen.findByRole('button', { name: /add item/i }))

  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: /add items/i })).toBeInTheDocument()
  })

  // Should be back to one row and empty bulk price
  expect(screen.getAllByTestId('variant-search-select')).toHaveLength(1)
  const [reopenedBulkInput] = screen.getAllByPlaceholderText('Apply to all rows')
  expect(reopenedBulkInput).toHaveValue(null)
})

it('does_not_show_compression_toast_when_no_files_compressed', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })
  vi.mocked(useUpdatePurchaseOrder).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ data: {} }),
    isPending: false,
  } as never)

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  const saveButton = await screen.findByRole('button', { name: /save/i })
  await userEvent.click(saveButton)

  await waitFor(() => {
    expect(vi.mocked(toast).success).toHaveBeenCalledWith('Purchase order updated')
  })
  expect(vi.mocked(toast).info).not.toHaveBeenCalled()
})

it('shows_compression_toast_when_files_compressed', async () => {
  mockIsStaff = true
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(basePo))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })
  vi.mocked(useUpdatePurchaseOrder).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({
      data: { compressed_files: ['purchase_order_invoice_file'] },
    }),
    isPending: false,
  } as never)

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  const saveButton = await screen.findByRole('button', { name: /save/i })
  await userEvent.click(saveButton)

  await waitFor(() => {
    expect(vi.mocked(toast).success).toHaveBeenCalledWith('Purchase order updated')
    expect(vi.mocked(toast).info).toHaveBeenCalledWith(
      expect.stringContaining('PO Invoice File')
    )
  })
})

it('test_dimension_warning_banner_shows_when_missing_dimensions', async () => {
  const baseDetail = {
    id: 'detail-1',
    variant_id: 'var-1',
    product_variant_name: 'Red Variant',
    product_id: 'prod-1',
    product_name: 'Product A',
    product_supplier_link: null,
    product_photo_url: null,
    ordered_qty: 10,
    received_qty: 10,
    unit_price_foreign: '50000.00',
    unit_price_base: 50000,
    discounted_unit_price_foreign: null,
    discounted_unit_price_base: null,
    total_price_foreign: '500000.00',
    total_price_base: 500000,
    discounted_total_price_foreign: null,
    discounted_total_price_base: null,
    remarks: '',
    avg_sales: null,
    avg_sales_7d: null,
    stock_on_hand: 0,
    incoming_qty: 0,
    variant_values: {},
    last_unit_price_foreign: null,
    last_currency: null,
  }

  const dimWarningDetail = {
    ...baseDetail,
    product_has_dimensions: false,
    shipping_per_unit_idr: null,
    delivery_per_unit_idr: null,
    commission_per_unit_idr: null,
    cogs_per_unit_idr: null,
  }

  const poWithDimWarning = {
    ...basePo,
    status: 'SHIPPED',
    shipping_fee_per_cbm: 100000,
    order_details: [dimWarningDetail],
  }

  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithDimWarning))
  renderPage()

  await waitFor(() => expect(screen.getByText(/have no product dimensions/)).toBeInTheDocument())
})

it('test_freight_strip_shows_in_delivered_po', async () => {
  const baseDetail = {
    id: 'detail-1',
    variant_id: 'var-1',
    product_variant_name: 'Red Variant',
    product_id: 'prod-1',
    product_name: 'Product A',
    product_supplier_link: null,
    product_photo_url: null,
    ordered_qty: 10,
    received_qty: 10,
    unit_price_foreign: '50000.00',
    unit_price_base: 50000,
    discounted_unit_price_foreign: null,
    discounted_unit_price_base: null,
    total_price_foreign: '500000.00',
    total_price_base: 500000,
    discounted_total_price_foreign: null,
    discounted_total_price_base: null,
    remarks: '',
    avg_sales: null,
    avg_sales_7d: null,
    stock_on_hand: 0,
    incoming_qty: 0,
    variant_values: {},
    last_unit_price_foreign: null,
    last_currency: null,
  }

  const freightDetail = {
    ...baseDetail,
    product_has_dimensions: true,
    shipping_per_unit_idr: 10000,
    delivery_per_unit_idr: 10000,
    commission_per_unit_idr: 2000,
    cogs_per_unit_idr: 72000,
  }

  const deliveredPo = {
    ...basePo,
    status: 'DELIVERED',
    order_details: [freightDetail],
  }

  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(deliveredPo))
  renderPage()

  await waitFor(() => expect(screen.getByText(/COGS\/unit/)).toBeInTheDocument())
  expect(screen.getByText(/Shipping\/unit/)).toBeInTheDocument()
})

it('test_currency_change_autofills_zero_price_items', async () => {
  mockIsStaff = true
  const poWithItems = {
    ...basePo,
    status: 'DRAFT',
    currency: 'USD',
    editable_fields: { header: ['currency', 'exchange_rate'], order_detail: ['unit_price_foreign', 'ordered_qty', 'discounted_unit_price_foreign'] },
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
        unit_price_foreign: null,
        unit_price_base: null,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: null,
        total_price_base: null,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_currency: 'CNY',
        last_unit_price_foreign: '25.0000',
      },
      {
        id: 'detail-2',
        variant_id: 'var-2',
        product_variant_name: 'Blue Variant',
        product_id: 'prod-1',
        product_name: 'Product A',
        product_supplier_link: null,
        product_photo_url: null,
        ordered_qty: 3,
        received_qty: null,
        unit_price_foreign: '50.00',
        unit_price_base: null,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: null,
        total_price_base: null,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 15,
        incoming_qty: 0,
        variant_values: {},
        last_currency: 'CNY',
        last_unit_price_foreign: '30.0000',
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  await waitFor(() => {
    expect(screen.getByTestId('currency-select-trigger')).toBeInTheDocument()
  })

  const currencyTrigger = screen.getByTestId('currency-select-trigger')
  await userEvent.click(currencyTrigger)

  const cnyOption = await screen.findByText('CNY (¥ Yuan)')
  await userEvent.click(cnyOption)

  await waitFor(() => {
    expect(vi.mocked(toast.info)).toHaveBeenCalledWith('Unit prices auto-filled from last purchase price')
  })
})

it('test_discount_price_autofilled_on_currency_change', async () => {
  mockIsStaff = true
  const poWithItems = {
    ...basePo,
    status: 'DRAFT',
    has_discount: true,
    currency: 'USD',
    editable_fields: { header: ['currency', 'exchange_rate'], order_detail: ['unit_price_foreign', 'ordered_qty', 'discounted_unit_price_foreign'] },
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
        unit_price_foreign: '0',
        unit_price_base: null,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: null,
        total_price_base: null,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_currency: 'CNY',
        last_unit_price_foreign: '17.50',
        last_discounted_unit_price_foreign: '15.00',
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  await waitFor(() => {
    expect(screen.getByTestId('currency-select-trigger')).toBeInTheDocument()
  })

  const currencyTrigger = screen.getByTestId('currency-select-trigger')
  await userEvent.click(currencyTrigger)

  const cnyOption = await screen.findByText('CNY (¥ Yuan)')
  await userEvent.click(cnyOption)

  await waitFor(() => {
    expect(vi.mocked(toast.info)).toHaveBeenCalledWith('Unit prices auto-filled from last purchase price')
  })
})

it('test_currency_change_warning_when_existing_prices', async () => {
  mockIsStaff = true
  const poWithItems = {
    ...basePo,
    status: 'DRAFT',
    has_discount: false,
    currency: 'USD',
    editable_fields: { header: ['currency', 'exchange_rate'], order_detail: ['unit_price_foreign'] },
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
        unit_price_foreign: '17.50',
        unit_price_base: null,
        discounted_unit_price_foreign: null,
        discounted_unit_price_base: null,
        total_price_foreign: null,
        total_price_base: null,
        discounted_total_price_foreign: null,
        discounted_total_price_base: null,
        remarks: '',
        avg_sales: null,
        avg_sales_7d: null,
        stock_on_hand: 20,
        incoming_qty: 0,
        variant_values: {},
        last_currency: null,
        last_unit_price_foreign: null,
        shipping_per_unit_idr: null,
        delivery_per_unit_idr: null,
        commission_per_unit_idr: null,
        cogs_per_unit_idr: null,
        product_has_dimensions: null,
      },
    ],
  }
  vi.mocked(usePurchaseOrder).mockReturnValue(hookResult(poWithItems))
  vi.mocked(useParams).mockReturnValue({ id: 'po-1' })

  renderPage()

  await waitFor(() => {
    expect(screen.getByText('PO-001')).toBeInTheDocument()
  })

  const editButton = screen.getByRole('button', { name: /edit/i })
  await userEvent.click(editButton)

  await waitFor(() => {
    expect(screen.getByTestId('currency-select-trigger')).toBeInTheDocument()
  })

  const currencyTrigger = screen.getByTestId('currency-select-trigger')
  await userEvent.click(currencyTrigger)

  const cnyOption = await screen.findByText('CNY (¥ Yuan)')
  await userEvent.click(cnyOption)

  await waitFor(() => {
    expect(vi.mocked(toast.warning)).toHaveBeenCalledWith('Currency changed — existing prices may be in the old currency')
  })
})

it('mapped_pool_lines_go_into_order_details_not_draft_mutation', async () => {
  mockPoolBrowserLines = [{
    sourcing_item_id: 'si-1',
    product_name: 'Widget',
    variant_name: 'Red',
    ordered_qty: 5,
    unit_price_foreign: 10,
    image_proxy_url: null,
    variant_id: 'v-mapped-1',
  }]
  const mockCreate = vi.fn().mockResolvedValue({ id: 'new-po-id' })
  const mockAddDraft = vi.fn().mockResolvedValue({})
  vi.mocked(useCreatePurchaseOrder).mockReturnValue({ mutateAsync: mockCreate, isPending: false } as never)
  vi.mocked(useAddDraftLine).mockReturnValue({ mutateAsync: mockAddDraft, isPending: false } as never)

  renderCreatePage()
  await selectWarehouseAndSupplier()

  await userEvent.click(screen.getByTestId('mock-add-pool-lines'))
  await userEvent.click(screen.getByRole('button', { name: /create po/i }))

  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        order_details: expect.arrayContaining([
          expect.objectContaining({ product_variant_id: 'v-mapped-1', ordered_qty: 5 }),
        ]),
      }),
    )
  })
  expect(mockAddDraft).not.toHaveBeenCalled()
})

it('unmapped_pool_lines_go_through_draft_mutation_not_order_details', async () => {
  mockPoolBrowserLines = [{
    sourcing_item_id: 'si-2',
    product_name: 'Widget',
    variant_name: 'Blue',
    ordered_qty: 3,
    unit_price_foreign: 12,
    image_proxy_url: null,
    variant_id: null,
  }]
  const mockCreate = vi.fn().mockResolvedValue({ id: 'new-po-id' })
  const mockAddDraft = vi.fn().mockResolvedValue({})
  vi.mocked(useCreatePurchaseOrder).mockReturnValue({ mutateAsync: mockCreate, isPending: false } as never)
  vi.mocked(useAddDraftLine).mockReturnValue({ mutateAsync: mockAddDraft, isPending: false } as never)

  renderCreatePage()
  await selectWarehouseAndSupplier()
  await userEvent.click(screen.getByTestId('mock-add-pool-lines'))
  await userEvent.click(screen.getByRole('button', { name: /create po/i }))

  await waitFor(() => {
    expect(mockAddDraft).toHaveBeenCalledWith(
      expect.objectContaining({ poId: 'new-po-id', sourcing_item_id: 'si-2', ordered_qty: 3 }),
    )
  })
  const createCall = mockCreate.mock.calls[0][0] as { order_details: unknown[] }
  expect(createCall.order_details).toHaveLength(0)
})

it('mixed_mapped_and_unmapped_lines_split_correctly', async () => {
  mockPoolBrowserLines = [
    {
      sourcing_item_id: 'si-3',
      product_name: 'Widget',
      variant_name: 'Red',
      ordered_qty: 5,
      unit_price_foreign: 10,
      image_proxy_url: null,
      variant_id: 'v-mapped-2',
    },
    {
      sourcing_item_id: 'si-4',
      product_name: 'Widget',
      variant_name: 'Green',
      ordered_qty: 2,
      unit_price_foreign: 8,
      image_proxy_url: null,
      variant_id: null,
    },
  ]
  const mockCreate = vi.fn().mockResolvedValue({ id: 'new-po-id' })
  const mockAddDraft = vi.fn().mockResolvedValue({})
  vi.mocked(useCreatePurchaseOrder).mockReturnValue({ mutateAsync: mockCreate, isPending: false } as never)
  vi.mocked(useAddDraftLine).mockReturnValue({ mutateAsync: mockAddDraft, isPending: false } as never)

  renderCreatePage()
  await selectWarehouseAndSupplier()
  await userEvent.click(screen.getByTestId('mock-add-pool-lines'))
  await userEvent.click(screen.getByRole('button', { name: /create po/i }))

  await waitFor(() => {
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        order_details: expect.arrayContaining([
          expect.objectContaining({ product_variant_id: 'v-mapped-2' }),
        ]),
      }),
    )
    expect(mockAddDraft).toHaveBeenCalledWith(
      expect.objectContaining({ poId: 'new-po-id', sourcing_item_id: 'si-4' }),
    )
  })
  const createCall = mockCreate.mock.calls[0][0] as { order_details: unknown[] }
  expect(createCall.order_details).toHaveLength(1)
})
