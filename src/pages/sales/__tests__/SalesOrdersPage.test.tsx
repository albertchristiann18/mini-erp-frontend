import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import SalesOrdersPage from '../SalesOrdersPage'

vi.mock('../../../hooks/api/useSales', () => ({
  useSalesOrders: vi.fn(),
  useConfirmSalesOrder: vi.fn(),
  useCancelSalesOrder: vi.fn(),
  useCreateSalesOrder: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null })),
}))

vi.mock('../../../hooks/api/inventory', () => ({
  useWarehouses: vi.fn(() => ({ data: { results: [] } })),
  useProductVariants: vi.fn(() => ({ data: { results: [] } })),
}))

import { useSalesOrders, useConfirmSalesOrder, useCancelSalesOrder } from '../../../hooks/api/useSales'

const mockOrders = [
  {
    id: 'o1', order_number: 'ORD-001', status: 'COMPLETED' as const,
    source_platform: 'SHOPEE' as const, cdate: '2026-05-01T00:00:00Z',
    net_revenue: 100000, gross_profit: 40000,
  },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(useConfirmSalesOrder).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useCancelSalesOrder).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  render(
    <QueryClientProvider client={qc}>
      <SalesOrdersPage />
    </QueryClientProvider>,
  )
}

it('shows loading spinner while fetching sales orders', () => {
  vi.mocked(useSalesOrders).mockReturnValue({
    data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn(),
  } as never)
  renderPage()
  expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
})

it('shows error message when sales orders fetch fails', () => {
  const refetch = vi.fn()
  vi.mocked(useSalesOrders).mockReturnValue({
    data: undefined, isLoading: false, isError: true,
    error: { status: 500, message: 'Failed to load orders' }, refetch,
  } as never)
  renderPage()
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText('Failed to load orders')).toBeInTheDocument()
})

it('shows empty state when there are no orders', () => {
  vi.mocked(useSalesOrders).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  renderPage()
  expect(screen.getByText('No sales orders found.')).toBeInTheDocument()
})

it('renders order row when data is available', () => {
  vi.mocked(useSalesOrders).mockReturnValue({
    data: { results: mockOrders, count: 1, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  renderPage()
  expect(screen.getByText('ORD-001')).toBeInTheDocument()
})
