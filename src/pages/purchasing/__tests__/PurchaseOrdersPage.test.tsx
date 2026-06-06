import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeEach } from 'vitest'
import PurchaseOrdersPage from '../PurchaseOrdersPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUsePurchaseOrdersFiltered = vi.fn()
const mockUsePurchaseOrderSummary = vi.fn()

vi.mock('../../../hooks/usePurchasing', () => ({
  usePurchaseOrdersFiltered: (...args: unknown[]) => mockUsePurchaseOrdersFiltered(...args),
  usePurchaseOrderSummary: (...args: unknown[]) => mockUsePurchaseOrderSummary(...args),
  useCreatePurchaseOrder: () => ({ mutate: () => {}, isPending: false }),
  useReplenishment: () => ({ data: { results: [] } }),
}))

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({ data: [] }),
  useProductVariants: () => ({ data: [] }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: false } }),
}))

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    count: 5,
    results: [
      {
        id: 'po1',
        company: 'c1',
        warehouse: 'w1',
        warehouse_name: 'Main WH',
        company_name: 'Test Co',
        purchase_order_number: 'PO-2026-001',
        status: 'ORDERED',
        supplier_name: 'Test Supplier',
        forwarder_name: 'Test Forwarder',
        shop_services: null,
        commission_fee_pct: null,
        commission_fee: null,
        commission_fee_rmb: null,
        delivery_fee: null,
        delivery_fee_idr: 675000,
        currency: 'CNY',
        exchange_rate: '2250.000',
        cbm: '1.500',
        weight: null,
        shipping_fee_per_cbm: null,
        shipping_fee: null,
        total_ordered_qty: 10,
        total_received_qty: 0,
        total_item_amount: 4950000,
        total_order_amount: null,
        total_amount: 5000000,
        procure_amount: null,
        refund_amount: null,
        cost_ratio_cogs: 12.5,
        shipping_per_qty: 25000,
        invoice_number: 'INV-001',
        invoice_date: '2026-05-01',
        delivery_order_number: null,
        delivery_date: null,
        forecast_delivery_date: '2026-08-01',
        forecast_cbm: null,
        forecast_shipping_fee: null,
        purchase_order_invoice_file: null,
        delivery_order_file: null,
        delivery_order_invoice_file: null,
        packing_list_file: null,
        cdate: '2026-05-01T00:00:00Z',
        udate: '2026-05-01T00:00:00Z',
        ...overrides,
      },
    ],
  }
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('renders page size selector with default "10 / page"', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({ data: undefined })
  renderPage()
  expect(await screen.findByText('10 / page')).toBeInTheDocument()
})

it('renders summary card when summary data has upcoming_count > 0', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({
    data: {
      upcoming_count: 3,
      upcoming_total_amount: 15000000,
      upcoming_total_item_amount: 12000000,
      upcoming_procure_amount: 13000000,
    },
  })
  renderPage()
  expect(await screen.findByText('Upcoming POs')).toBeInTheDocument()
  expect(await screen.findByText('3')).toBeInTheDocument()
  expect(await screen.findByText('Total Upcoming Value')).toBeInTheDocument()
})

it('summary card is hidden when upcoming_count == 0', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({
    data: {
      upcoming_count: 0,
      upcoming_total_amount: 0,
      upcoming_total_item_amount: 0,
      upcoming_procure_amount: 0,
    },
  })
  renderPage()
  expect(screen.queryByText('Upcoming POs')).not.toBeInTheDocument()
})

it('clicking Invoice Date column header toggles ordering', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({ data: undefined })
  renderPage()

  const invoiceDateHeader = await screen.findByText('Invoice Date')
  fireEvent.click(invoiceDateHeader)

  expect(mockUsePurchaseOrdersFiltered).toHaveBeenLastCalledWith(
    expect.objectContaining({ ordering: '-invoice_date' }),
    expect.objectContaining({ enabled: true }),
  )
})

it('renders Created Date column header', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({ data: undefined })
  renderPage()
  expect(await screen.findByText('Created Date')).toBeInTheDocument()
})

it('clicking a table row navigates to the PO detail page', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({ data: undefined })
  renderPage()

  const searchInput = screen.getByPlaceholderText('Search PO#, Invoice#, DO#...')
  fireEvent.change(searchInput, { target: { value: 'PO-2026' } })
  fireEvent.keyDown(searchInput, { key: 'Enter' })

  const row = await screen.findByText('PO-2026-001')
  fireEvent.click(row)

  expect(mockNavigate).toHaveBeenCalledWith('/purchasing/orders/po1')
})

it('loads data immediately on mount without requiring a search trigger', async () => {
  mockUsePurchaseOrdersFiltered.mockReturnValue({ data: makeData(), isLoading: false })
  mockUsePurchaseOrderSummary.mockReturnValue({ data: undefined })
  renderPage()
  expect(mockUsePurchaseOrdersFiltered).toHaveBeenCalledWith(
    expect.objectContaining({ ordering: '-delivery_date' }),
    expect.objectContaining({ enabled: true }),
  )
})
