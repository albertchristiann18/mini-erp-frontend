import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import PurchaseOrderDetailPage from '../PurchaseOrderDetailPage'

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { is_staff: true } }),
}))

vi.mock('../../../hooks/useInventory', () => ({
  useProductVariants: () => ({ data: { results: [] } }),
}))

vi.mock('../../../hooks/usePurchasing', () => ({
  usePurchaseOrder: () => ({
    data: {
      id: '01ABC',
      purchase_order_number: 'PO-2026-001',
      status: 'ORDERED',
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
      order_details: [
        {
          id: 'det1',
          product_variant: 'v1',
          product_variant_name: 'Blue / M',
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
      cdate: '2026-05-01T00:00:00Z',
      udate: '2026-05-01T00:00:00Z',
    },
    isLoading: false,
  }),
  useUpdatePurchaseOrder: () => ({
    mutateAsync: vi.fn(),
  }),
}))

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
  expect(await screen.findByText('ORDERED')).toBeInTheDocument()
})

it('renders the supplier name (Test Supplier)', async () => {
  renderPage()
  expect(await screen.findByText('Test Supplier')).toBeInTheDocument()
})

it('renders the line items table with Blue / M variant', async () => {
  renderPage()
  expect(await screen.findByText('Blue / M')).toBeInTheDocument()
})

it('renders the PO Invoice attachment link', async () => {
  renderPage()
  const link = await screen.findByText('PO Invoice')
  expect(link).toBeInTheDocument()
  expect(link.closest('a')).toHaveAttribute('href', 'https://example.com/invoice.pdf')
})

it('renders the forecast delivery date (formatted)', async () => {
  renderPage()
  expect(await screen.findByText('01 Agu 2026')).toBeInTheDocument()
})
