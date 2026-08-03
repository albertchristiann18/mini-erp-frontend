import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe } from 'vitest'
import ReportsPage from '../ReportsPage'

vi.mock('../../../hooks/api/useFinance', () => ({
  useIncomeStatement: vi.fn(),
  useBalanceSheet: vi.fn(),
  useCashFlow: vi.fn(),
}))

import { useIncomeStatement, useBalanceSheet, useCashFlow } from '../../../hooks/api/useFinance'

const mockIncome = {
  revenue: 10000000,
  cogs: 5000000,
  gross_profit: 5000000,
  total_expenses: 1000000,
  net_profit: 4000000,
}

const mockBalance = {
  assets: { total: 20000000, cash: 10000000, receivables: 5000000, inventory: 5000000 },
  liabilities: { total: 8000000, payables: 8000000 },
  equity: 12000000,
}

const mockCashflow = {
  operating: { collections: 9000000, payments: 4000000 },
  net_cash_flow: 5000000,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ReportsPage', () => {
  it('shows income statement data when available', () => {
    vi.mocked(useIncomeStatement).mockReturnValue(
      ({ data: mockIncome, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useBalanceSheet).mockReturnValue(
      ({ data: mockBalance, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useCashFlow).mockReturnValue(
      ({ data: mockCashflow, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    renderPage()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('Net Profit')).toBeInTheDocument()
  })

  it('shows error state in income tab when income statement fetch fails', () => {
    vi.mocked(useIncomeStatement).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Income fetch failed' }, refetch: vi.fn() }) as never,
    )
    vi.mocked(useBalanceSheet).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useCashFlow).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Income fetch failed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows loading state in income tab while fetching', () => {
    vi.mocked(useIncomeStatement).mockReturnValue(
      ({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useBalanceSheet).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useCashFlow).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })
})
