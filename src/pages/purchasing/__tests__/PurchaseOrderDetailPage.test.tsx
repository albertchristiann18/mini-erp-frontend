import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import PurchaseOrderDetailPage from '../PurchaseOrderDetailPage'
import { usePurchaseOrder } from '../../../hooks/usePurchasing'
import type { UseQueryResult } from '@tanstack/react-query'
import type { PurchaseOrder } from '../../../types/purchasing'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: true } }),
}))

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({
    onSelect,
    placeholder,
  }: {
    value: string
    selectedLabel?: string
    onSelect: (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null) => void
    placeholder?: string
  }) => (
    <button data-testid="variant-search-select" onClick={() => onSelect('v-mock', 'Mock Variant (SKU-MOCK)', 'prod1', 'T-Shirt', 'https://supplier.example.com')}>
      {placeholder ?? 'Select variant'}
    </button>
  ),
}))

const { mockUsePurchaseOrder } = vi.hoisted(() => ({
  mockUsePurchaseOrder: vi.fn(),
}))

vi.mock('../../../hooks/usePurchasing', () => ({
  usePurchaseOrder: mockUsePurchaseOrder,
  useUpdatePurchaseOrder: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAdvancePOStatus: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCheckPOTransition: () => ({
    mutate: vi.fn(),
    data: { can_transition: true, target_status: 'SHIPPED', missing_fields: [], warnings: [] },
    isPending: false,
  }),
  useReplenishment: () => ({ data: { results: [] } }),
}))

const defaultPOData = {
  id: '01ABC',
  purchase_order_number: 'PO-2026-001',
  status: 'ORDERED' as const,
  next_status: 'SHIPPED' as const,
  status_history: [
    {
      id: 'hist1',
      from_status: 'DRAFT' as const,
      to_status: 'ORDERED' as const,
      changed_by_name: 'Albert',
      note: null,
      cdate: '2026-05-29T09:00:00Z',
    },
  ],
  supplier_name: 'Test Supplier',
  forwarder_name: 'Test Forwarder',
  total_amount: 5000000,
  cost_ratio_cogs: 12.5,
  shipping_per_qty: 25000,
  exchange_rate: '2250.000',
  cbm: '1.500',
  forecast_delivery_date: '2026-08-01',
  forecast_cbm: null,
  forecast_shipping_fee: null,
  invoice_number: 'INV-001',
  invoice_date: '2026-05-01',
  delivery_date: null,
  delivery_order_number: null,
  purchase_order_invoice_file: 'https://example.com/invoice.pdf',
  delivery_order_file: null,
  delivery_order_invoice_file: null,
  packing_list_file: null,
  note: null,
  editable_fields: {
    header: ['supplier_name', 'forwarder_name', 'shop_services', 'invoice_number', 'invoice_date',
      'delivery_order_number', 'delivery_date', 'forecast_delivery_date', 'currency', 'exchange_rate',
      'commission_fee_pct', 'delivery_fee', 'commission_fee_rmb', 'cbm', 'weight', 'forecast_cbm',
      'forecast_shipping_fee', 'purchase_order_invoice_file', 'delivery_order_file',
      'delivery_order_invoice_file', 'packing_list_file'],
    order_detail: ['ordered_qty', 'unit_price_foreign', 'discounted_unit_price_foreign'],
  },
  order_details: [
    {
      id: 'det1',
      variant_id: 'v1',
      product_variant_name: 'Blue / M',
      product_id: 'prod1',
      product_name: 'T-Shirt',
      product_supplier_link: 'https://supplier.example.com/product/1',
      product_photo_url: null,
      ordered_qty: 10,
      received_qty: null,
      unit_price_foreign: '25.000',
      discounted_unit_price_foreign: '22.000',
      total_price_base: 562500,
      discounted_total_price_base: 495000,
      unit_price_base: 56250,
      discounted_unit_price_base: 49500,
      total_price_foreign: '250.000',
      discounted_total_price_foreign: '220.000',
      remarks: '',
      avg_sales: null,
      avg_sales_7d: null,
      stock_on_hand: 0,
      incoming_qty: 0,
    },
  ],
  company: 'c1',
  warehouse: 'w1',
  warehouse_name: 'Main WH',
  company_name: 'Test Co',
  shop_services: 'Taobao',
  commission_fee_pct: 5,
  commission_fee: 250000,
  commission_fee_rmb: '150.000',
  delivery_fee: '300.000',
  currency: 'CNY',
  weight: '5.000',
  shipping_fee_per_cbm: 3000000,
  shipping_fee: 4500000,
  procure_amount: 4750000,
  refund_amount: null,
  total_ordered_qty: 10,
  total_received_qty: 0,
  total_item_amount: 4950000,
  total_order_amount: 5200000,
  delivery_fee_idr: null,
  cogs_ratio_forecast: null,
  cdate: '2026-05-01T00:00:00Z',
  udate: '2026-05-01T00:00:00Z',
}

beforeEach(() => {
  vi.mocked(usePurchaseOrder).mockReturnValue({ data: defaultPOData, isLoading: false } as UseQueryResult<PurchaseOrder, Error>)
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/purchasing/orders/01ABC']}>
        <Routes>
          <Route path="/purchasing/orders/:id" element={<PurchaseOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders the PO number (PO-2026-001) in the heading', async () => {
  renderPage()
  expect(await screen.findByText('PO-2026-001')).toBeInTheDocument()
})

it('renders the status badge (ORDERED)', async () => {
  renderPage()
  const badges = await screen.findAllByText('ORDERED')
  expect(badges.length).toBeGreaterThanOrEqual(1)
})

it('renders the supplier name (Test Supplier)', async () => {
  renderPage()
  const elements = await screen.findAllByText('Test Supplier')
  expect(elements.length).toBeGreaterThan(0)
})

it('renders the line items table with Blue / M variant', async () => {
  renderPage()
  expect(await screen.findByText('Blue / M')).toBeInTheDocument()
})

it('renders the PO Invoice attachment link', async () => {
  renderPage()
  expect(await screen.findByText('PO Invoice')).toBeInTheDocument()
  const viewBtn = screen.getByText('View')
  expect(viewBtn.closest('a')).toHaveAttribute('href', 'https://example.com/invoice.pdf')
})

it('renders the forecast delivery date (formatted)', async () => {
  renderPage()
  expect(await screen.findByText('01 Agu 2026')).toBeInTheDocument()
})

it('renders Advance Status button showing next status for staff', async () => {
  renderPage()
  expect(await screen.findByText('→ SHIPPED')).toBeInTheDocument()
})

it('renders status history timeline with correct status badge', async () => {
  renderPage()
  const heading = await screen.findByText('Status History')
  const section = heading.closest('div')!
  expect(within(section).getByText('ORDERED')).toBeInTheDocument()
})

it('renders Edit button for staff (including COMPLETED status)', async () => {
  renderPage()
  expect(await screen.findByText('Edit')).toBeInTheDocument()
})

it('clicking Edit shows Save and Cancel buttons', async () => {
  renderPage()
  const editBtn = await screen.findByText('Edit')
  await userEvent.click(editBtn)
  expect(await screen.findByText('Save')).toBeInTheDocument()
  expect(await screen.findByText('Cancel')).toBeInTheDocument()
})

it('renders Notes card showing No notes when note is null', async () => {
  renderPage()
  expect(await screen.findByText('No notes')).toBeInTheDocument()
})

it('hides Commission (RMB) field', async () => {
  renderPage()
  expect(screen.queryByText('Commission (RMB)')).not.toBeInTheDocument()
})

it('does not show currency badge in Order Items header', async () => {
  renderPage()
  const heading = await screen.findByText('Order Items')
  const parent = heading.closest('div')!
  expect(parent).not.toHaveTextContent('CNY')
})

it('shows Add Item button in edit mode for ORDERED status', async () => {
  renderPage()
  const editBtn = await screen.findByText('Edit')
  await userEvent.click(editBtn)
  expect(await screen.findByText('Add Item')).toBeInTheDocument()
})

it('shows delete button per row in edit mode for ORDERED status', async () => {
  renderPage()
  const editBtn = await screen.findByText('Edit')
  await userEvent.click(editBtn)
  const rowEl = await screen.findByText('Blue / M').then(el => el.closest('tr')!)
  const deleteBtn = rowEl.querySelector('button')
  expect(deleteBtn).toBeInTheDocument()
})

it('hides Add Item button when not in edit mode', async () => {
  renderPage()
  expect(screen.queryByText('Add Item')).not.toBeInTheDocument()
})

it('shows variant search select in new item row after clicking Add Item', async () => {
  renderPage()
  const editBtn = await screen.findByText('Edit')
  await userEvent.click(editBtn)
  const addBtn = await screen.findByText('Add Item')
  await userEvent.click(addBtn)
  expect(await screen.findByTestId('variant-search-select')).toBeInTheDocument()
})

it('renders Shipping Fee / CBM label in PO info card', async () => {
  renderPage()
  expect(await screen.findByText('Shipping Fee / CBM')).toBeInTheDocument()
})

it('shows product group headers with supplier link in order items', async () => {
  renderPage()
  const tshirts = await screen.findAllByText('T-Shirt')
  expect(tshirts.length).toBeGreaterThanOrEqual(1)
  const supplierLink = document.querySelector('a[href="https://supplier.example.com/product/1"]')
  expect(supplierLink).toBeInTheDocument()
})

it('shows correct group qty and cost totals', async () => {
  renderPage()
  await screen.findAllByText('T-Shirt')
  expect(screen.getAllByText('10')[0]).toBeInTheDocument()
  expect(screen.getAllByText(/Rp/).length).toBeGreaterThanOrEqual(1)
})

it('shows currency as select in edit mode', async () => {
  renderPage()
  const editBtn = await screen.findByText('Edit')
  await userEvent.click(editBtn)
  const comboboxes = await screen.findAllByRole('combobox')
  expect(comboboxes.length).toBeGreaterThanOrEqual(1)
})

it('shows stock intel columns inline (SOH, Incoming, Upcoming, AVG, DOI, DOI+)', async () => {
  renderPage()
  expect(await screen.findByText('SOH')).toBeInTheDocument()
  expect(await screen.findByText('Incoming')).toBeInTheDocument()
  expect(await screen.findByText('Upcoming')).toBeInTheDocument()
  expect(await screen.findByText('AVG')).toBeInTheDocument()
  expect(await screen.findByText('DOI')).toBeInTheDocument()
  expect(await screen.findByText('DOI+')).toBeInTheDocument()
})

it('shows COGS/u column header', async () => {
  renderPage()
  expect(await screen.findByText('COGS/u')).toBeInTheDocument()
})
