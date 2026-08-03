import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import ReplenishmentPage from '../ReplenishmentPage'

const mockMutateAsync = vi.fn()
const mockUseReplenishmentImpl = vi.fn()

vi.mock('../../../hooks/api/usePurchasing', () => ({
  useReplenishment: (...args: unknown[]) => mockUseReplenishmentImpl(...args),
  useCreatePurchaseOrder: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

mockUseReplenishmentImpl.mockReturnValue({
  data: {
    results: [
      {
        variant_id: 'v1',
        sku_variant_code: 'SKU-RED-M',
        variant_name: 'Red / M',
        product_name: 'T-Shirt',
        stock_on_hand: 20,
        incoming_qty: 5,
        avg_sales_7d: 3.0,
        avg_sales_30d: 2.5,
      },
    ],
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
})

vi.mock('../../../hooks/api/inventory', () => ({
  useWarehouses: () => ({
    data: { results: [{ id: 'w1', name: 'Warehouse A' }] },
    isLoading: false,
  }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { company_id: 'c1' } }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReplenishmentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders Replenishment Planning heading', () => {
  renderPage()
  expect(screen.getByText('Replenishment Planning')).toBeInTheDocument()
})

it('renders product name T-Shirt in the table', () => {
  renderPage()
  expect(screen.getByText('T-Shirt')).toBeInTheDocument()
})

it('renders avg sales 2.5 for 30d default', () => {
  renderPage()
  expect(screen.getByText('2.5')).toBeInTheDocument()
})

it('computes suggestion_qty as 50', () => {
  renderPage()
  expect(screen.getByText('50')).toBeInTheDocument()
})

it('Create Draft PO button starts disabled', () => {
  renderPage()
  expect(screen.getByRole('button', { name: 'Create Draft PO' })).toBeDisabled()
})

it('button becomes enabled after setting order qty', async () => {
  renderPage()
  const user = userEvent.setup()
  const orderQtyInput = screen.getByPlaceholderText('50')
  await user.clear(orderQtyInput)
  await user.type(orderQtyInput, '10')
  expect(screen.getByRole('button', { name: 'Create Draft PO' })).toBeEnabled()
})

it('shows error state when replenishment fetch fails', async () => {
  mockUseReplenishmentImpl.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Server error' }, refetch: vi.fn() })
  renderPage()
  expect(await screen.findByText('Server error')).toBeInTheDocument()
})
