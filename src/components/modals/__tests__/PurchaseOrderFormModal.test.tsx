import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import { PurchaseOrderFormModal, VariantStockStrip } from '../PurchaseOrderFormModal'
import { useSourcingPoolItems } from '../../../features/purchasing/hooks/useSourcingPool'

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

vi.mock('../../../features/purchasing/hooks/useSourcingPool', () => ({
  useSourcingPoolItems: vi.fn(() => ({ data: { pool_id: null, items: [] }, isLoading: false, isError: false })),
  useAddDraftLine: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}))

vi.mock('../../../features/purchasing/components/PoolBrowser', () => ({
  PoolBrowser: ({ onAddLines }: { onAddLines: (lines: { sourcing_item_id: string; product_name: string; variant_name: string; ordered_qty: number; unit_price_foreign: number; image_proxy_url: string | null }[]) => void }) => (
    <div>
      PoolBrowser Mock
      <button
        type="button"
        onClick={() =>
          onAddLines([
            { sourcing_item_id: 'sp1', product_name: 'Pool Product', variant_name: 'Pool Variant', ordered_qty: 3, unit_price_foreign: 15.5, image_proxy_url: null },
          ])
        }
      >
        Add Pool Line
      </button>
    </div>
  ),
}))

vi.mock('../../../features/purchasing/components/SourcingPoolImportModal', () => ({
  SourcingPoolImportModal: ({ open }: { open: boolean }) => (
    <div>{open ? 'ImportModal Open' : 'ImportModal Closed'}</div>
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

it('shows Import from Excel button when supplier is selected', async () => {
  renderModal()
  expect(screen.queryByText('Import from Excel')).not.toBeInTheDocument()
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[0])
  const option = await screen.findByRole('option', { name: 'Supplier A' })
  await userEvent.click(option)
  expect(screen.getByText('Import from Excel')).toBeInTheDocument()
})

it('clicking Import from Excel opens the import modal', async () => {
  renderModal()
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[0])
  const option = await screen.findByRole('option', { name: 'Supplier A' })
  await userEvent.click(option)
  await userEvent.click(screen.getByText('Import from Excel'))
  expect(screen.getByText('ImportModal Open')).toBeInTheDocument()
})

it('pool browser section is hidden when pool has no items for selected supplier', async () => {
  renderModal()
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[0])
  const option = await screen.findByRole('option', { name: 'Supplier A' })
  await userEvent.click(option)
  expect(screen.queryByText('Sourcing Pool')).not.toBeInTheDocument()
})

it('draft lines section renders after handleAddPoolLines called', async () => {
  vi.mocked(useSourcingPoolItems).mockReturnValue({
    data: { pool_id: 'p1', items: [{ id: 'sp1', product_name: 'Pool Product', variant_name: 'Pool Variant', category_id: null, category_name: null, category_code: null, unit_price: '10.00', discounted_price: null, qty_suggested: null, supplier_link: null, image_url: null, image_proxy_url: null, image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '' }] },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useSourcingPoolItems>)
  renderModal()
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[0])
  const option = await screen.findByRole('option', { name: 'Supplier A' })
  await userEvent.click(option)
  await userEvent.click(screen.getByText('Add Pool Line'))
  expect(screen.getByText('Sourcing Pool Lines (1)')).toBeInTheDocument()
  expect(screen.getByText('Pool Product — Pool Variant')).toBeInTheDocument()
})

it('draft line can be removed with delete button', async () => {
  vi.mocked(useSourcingPoolItems).mockReturnValue({
    data: { pool_id: 'p1', items: [{ id: 'sp1', product_name: 'Pool Product', variant_name: 'Pool Variant', category_id: null, category_name: null, category_code: null, unit_price: '10.00', discounted_price: null, qty_suggested: null, supplier_link: null, image_url: null, image_proxy_url: null, image_download_status: 'DONE' as const, notes: null, times_ordered: 0, cdate: '', udate: '' }] },
    isLoading: false,
    isError: false,
    } as ReturnType<typeof useSourcingPoolItems>)
  renderModal()
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[0])
  const option = await screen.findByRole('option', { name: 'Supplier A' })
  await userEvent.click(option)
  await userEvent.click(screen.getByText('Add Pool Line'))
  expect(screen.getByText('Sourcing Pool Lines (1)')).toBeInTheDocument()
  const draftTrash = screen.getByText('Sourcing Pool Lines (1)').closest('div')?.querySelector('button')
  if (draftTrash) await userEvent.click(draftTrash)
  expect(screen.queryByText('Sourcing Pool Lines (1)')).not.toBeInTheDocument()
})

it('submit fails with error when no regular items and no draft lines', async () => {
  renderModal()
  // Select warehouse (combos[0] = Supplier, combos[1] = Warehouse)
  const combos = screen.getAllByRole('combobox')
  await userEvent.click(combos[1])
  const option = await screen.findByRole('option', { name: 'Main WH' })
  await userEvent.click(option)
  await userEvent.click(screen.getByRole('button', { name: /create po/i }))
  await waitFor(() => expect(screen.getByText(/At least one item/i)).toBeInTheDocument())
})
