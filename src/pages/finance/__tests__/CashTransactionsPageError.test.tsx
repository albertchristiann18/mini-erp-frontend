/**
 * Tests for CashTransactionsPage error/loading/empty states.
 * Happy-path and interaction tests live in CashTransactionsPage.test.tsx.
 */
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, describe } from 'vitest'
import CashTransactionsPage from '../CashTransactionsPage'

vi.mock('../../../hooks/api/useFinance', () => ({
  useCashTransactions: vi.fn(),
  useCreateCashTransaction: vi.fn(),
  useUpdateCashTransaction: vi.fn(),
  useDeleteCashTransaction: vi.fn(),
}))

import {
  useCashTransactions, useCreateCashTransaction, useUpdateCashTransaction, useDeleteCashTransaction,
} from '../../../hooks/api/useFinance'

const mockMutation = { mutateAsync: vi.fn(), isPending: false } as never

function setupMutations() {
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <CashTransactionsPage />
    </QueryClientProvider>,
  )
}

describe('CashTransactionsPage — query states', () => {
  it('shows loading indicator while fetching', () => {
    vi.mocked(useCashTransactions).mockReturnValue(
      ({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    setupMutations()
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows error state with message and retry when fetch fails', () => {
    const refetchMock = vi.fn()
    vi.mocked(useCashTransactions).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Failed to load transactions' }, refetch: refetchMock }) as never,
    )
    setupMutations()
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load transactions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
