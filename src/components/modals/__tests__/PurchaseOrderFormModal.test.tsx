import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import { PurchaseOrderFormModal, VariantStockStrip } from '../PurchaseOrderFormModal'

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({ data: { results: [{ id: 'w1', name: 'Main WH' }] } }),
  useSuppliers: () => ({ data: { results: [{ id: 'sup1', name: 'Supplier A' }] } }),
  useCreateSupplier: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'sup3', name: 'New Sup', is_active: true, contact_name: null, phone: null, country: null, notes: null, supplier_link: null, company_id: 'c1', cdate: '', udate: '' }), isPending: false }),
  useUpdateSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('../../../hooks/usePurchasing', () => ({
  useCreatePurchaseOrder: () => ({ mutateAsync: vi.fn() }),
  useReplenishment: () => ({ data: { results: [] } }),
}))

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({ placeholder }: { placeholder?: string }) => (
    <div>{placeholder ?? 'Select variant'}</div>
  ),
}))

function renderModal(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderFormModal open={open} onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows column headers when modal opens', () => {
  renderModal()
  expect(screen.getByText('Variant')).toBeInTheDocument()
  expect(screen.getByText('Qty')).toBeInTheDocument()
  expect(screen.getByText('Unit Price')).toBeInTheDocument()
})

it('shows Disc. Price header when Has Discount is checked', async () => {
  renderModal()
  expect(screen.queryByText('Disc. Price')).not.toBeInTheDocument()
  await userEvent.click(screen.getByLabelText('Has Discount'))
  expect(screen.getByText('Disc. Price')).toBeInTheDocument()
})

it('shows discount column when Has Discount is checked', async () => {
  renderModal()
  expect(screen.getByText('New Purchase Order')).toBeInTheDocument()

  const checkbox = screen.getByLabelText('Has Discount')
  expect(checkbox).not.toBeChecked()

  expect(screen.getAllByRole('spinbutton')).toHaveLength(3)

  await userEvent.click(checkbox)
  expect(checkbox).toBeChecked()

  expect(screen.getAllByRole('spinbutton')).toHaveLength(4)
})

it('VariantStockStrip shows rec qty', () => {
  const map = new Map()
  map.set('v1', {
    variant_id: 'v1',
    sku_variant_code: 'SKU-1',
    product_name: 'Product A',
    product_id: 'p1',
    avg_sales_7d: 0.5,
    avg_sales_30d: 1,
    stock_on_hand: 30,
    incoming_qty: 10,
  })
  render(<VariantStockStrip variantId="v1" stockMap={map} avgWindow={30} orderedQty={0} />)
  expect(screen.getByText('Rec:')).toBeInTheDocument()
  expect(screen.getByText('50')).toBeInTheDocument()
})

it('VariantStockStrip Use button calls onUseRec', async () => {
  const onUseRec = vi.fn()
  const map = new Map()
  map.set('v1', {
    variant_id: 'v1',
    sku_variant_code: 'SKU-1',
    product_name: 'Product A',
    product_id: 'p1',
    avg_sales_7d: 0.5,
    avg_sales_30d: 1,
    stock_on_hand: 30,
    incoming_qty: 10,
  })
  render(<VariantStockStrip variantId="v1" stockMap={map} avgWindow={30} orderedQty={0} onUseRec={onUseRec} />)
  await userEvent.click(screen.getByText('Use'))
  expect(onUseRec).toHaveBeenCalledWith(50)
})
