import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import StockClosingPage from '../StockClosingPage'

vi.mock('../../../hooks/useInventory', () => ({
  useStockClosingReport: vi.fn(),
  useWarehouses: vi.fn(),
}))

import { useStockClosingReport, useWarehouses } from '../../../hooks/useInventory'

const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 1, next: null, previous: null,
}

const mockStockData = {
  results: [
    {
      id: 'm1', company: 'c1', product_variant: 'v1',
      product_variant_name: 'Blue / M', warehouse: 'w1', warehouse_name: 'Warehouse A',
      movement_type: 'INBOUND', quantity: 10, balance_before: 0, balance_after: 10,
      reference_number: '', note: '', cdate: '2026-05-15T10:00:00Z',
    },
    {
      id: 'm2', company: 'c1', product_variant: 'v1',
      product_variant_name: 'Blue / M', warehouse: 'w1', warehouse_name: 'Warehouse A',
      movement_type: 'OUTBOUND', quantity: -3, balance_before: 10, balance_after: 7,
      reference_number: '', note: '', cdate: '2026-05-20T10:00:00Z',
    },
  ],
  count: 2, next: null, previous: null,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <StockClosingPage />
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

it('renders "Stock Closing Report" heading', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  expect(screen.getByText('Stock Closing Report')).toBeInTheDocument()
})

it('renders variant name (Blue / M)', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  expect(screen.getByText('Blue / M')).toBeInTheDocument()
})

it('computes beginning correctly (0 = balance_before of first movement)', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  const cells = screen.getAllByRole('cell')
  const beginningCell = cells[1]
  expect(beginningCell).toHaveTextContent('0')
})

it('computes in_qty correctly (10 = abs(INBOUND quantity))', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  const cells = screen.getAllByRole('cell')
  const inCell = cells[2]
  expect(inCell).toHaveTextContent('+10')
})

it('computes out_qty correctly (3 = abs(OUTBOUND quantity))', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  const cells = screen.getAllByRole('cell')
  const outCell = cells[3]
  expect(outCell).toHaveTextContent('-3')
})

it('computes after correctly (7 = balance_after of last movement)', () => {
  vi.mocked(useStockClosingReport).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  renderPage()
  const cells = screen.getAllByRole('cell')
  const afterCell = cells[5]
  expect(afterCell).toHaveTextContent('7')
})
