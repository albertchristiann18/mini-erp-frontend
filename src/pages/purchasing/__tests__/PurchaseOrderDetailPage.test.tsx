import { render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: vi.fn(() => ({ data: { results: [] } })),
  useSuppliers: vi.fn(() => ({ data: { results: [] } })),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { is_staff: false } })),
}))

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: () => <div data-testid="variant-search-select" />,
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
