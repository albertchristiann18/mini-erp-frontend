import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import { PurchaseOrderFormModal } from '../../../components/modals/PurchaseOrderFormModal'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({
    onSelect,
    placeholder,
  }: {
    value: string
    selectedLabel?: string
    onSelect: (id: string, label: string, productId: string, productName: string, productSupplierLink: string | null, productPhotoUrl: string | null) => void
    placeholder?: string
  }) => (
    <button
      data-testid="variant-search-select"
      onClick={() => onSelect('v1', 'Variant 1 (V1)', 'prod1', 'Product A', 'https://supplier.example.com/prod1', null)}
    >
      {placeholder ?? 'Select variant'}
    </button>
  ),
}))

const mockMutateAsync = vi.fn()

vi.mock('../../../hooks/usePurchasing', () => ({
  useCreatePurchaseOrder: () => {
    const id = 'new-po-1'
    mockMutateAsync.mockResolvedValue(id)
    return { mutateAsync: mockMutateAsync, isPending: false }
  },
  useReplenishment: () => ({
    data: {
      results: [
        {
          variant_id: 'v1',
          sku_variant_code: 'V1',
          variant_name: 'Variant 1',
          product_name: 'Product A',
          stock_on_hand: 10,
          incoming_qty: 20,
          avg_sales_7d: 1.5,
          avg_sales_30d: 2.0,
        },
      ],
    },
  }),
}))

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({
    data: {
      count: 2,
      results: [
        { id: 'w1', name: 'Main WH' },
        { id: 'w2', name: 'Secondary WH' },
      ],
    },
  }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderFormModal open={true} onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders grouped items by product when two variants share the same product_id', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const addBtn = screen.getByText('Add Item')
  fireEvent.click(addBtn)
  fireEvent.click(addBtn)

  const selects = screen.getAllByTestId('variant-search-select')
  expect(selects.length).toBeGreaterThanOrEqual(2)
  fireEvent.click(selects[0])
  fireEvent.click(selects[1])

  const productNames = screen.getAllByText('Product A')
  expect(productNames.length).toBeGreaterThanOrEqual(1)
})

it('shows supplier link icon when product has supplier link', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const selects = screen.getAllByTestId('variant-search-select')
  fireEvent.click(selects[0])

  const linkIcons = screen.queryAllByText('Supplier')
  expect(linkIcons.length).toBeGreaterThanOrEqual(1)
})

it('shows group total qty and cost', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const qtyElements = screen.getAllByText(/Qty:/)
  expect(qtyElements.length).toBeGreaterThanOrEqual(1)

  const costElements = screen.getAllByText(/Cost:/)
  expect(costElements.length).toBeGreaterThanOrEqual(1)
})

it('shows stock intel strip with SOH, AVG, DOI when variant is selected', async () => {
  renderModal()
  expect(await screen.findByText('New Purchase Order')).toBeInTheDocument()

  const selects = screen.getAllByTestId('variant-search-select')
  fireEvent.click(selects[0])

  expect(screen.getByText(/SOH:/)).toBeInTheDocument()
  expect(screen.getByText(/Incoming:/)).toBeInTheDocument()
  expect(screen.getByText(/AVG/)).toBeInTheDocument()
  expect(screen.getByText(/DOI:/)).toBeInTheDocument()
})
