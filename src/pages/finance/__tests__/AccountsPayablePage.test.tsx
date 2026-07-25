import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe } from 'vitest'
import AccountsPayablePage from '../AccountsPayablePage'

vi.mock('../../../hooks/api/useFinance', () => ({
  useAccountsPayable: vi.fn(),
  useRecordPayment: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAccountsPayable, useRecordPayment } from '../../../hooks/api/useFinance'
import { useAuth } from '../../../contexts/AuthContext'

const mockAPData = {
  results: [
    {
      id: 'ap1',
      purchase_order_number: 'PO-001',
      supplier_name: 'Supplier A',
      status: 'UNPAID' as const,
      total_amount: 1000000,
      paid_amount: 0,
      remaining_amount: 1000000,
      due_date: '2026-08-01',
    },
  ],
  count: 1,
  next: null,
  previous: null,
}

const mockMutation = { mutateAsync: vi.fn(), isPending: false } as never

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AccountsPayablePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccountsPayablePage', () => {
  it('renders AP rows on happy path', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsPayable).mockReturnValue(
      ({ data: mockAPData, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useRecordPayment).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.getByText('Supplier A')).toBeInTheDocument()
  })

  it('shows loading indicator while fetching', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsPayable).mockReturnValue(
      ({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useRecordPayment).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows empty state when no records exist', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsPayable).mockReturnValue(
      ({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useRecordPayment).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText(/no payable/i)).toBeInTheDocument()
  })

  it('shows error state with message and retry when fetch fails', () => {
    const refetchMock = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsPayable).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Failed to load AP' }, refetch: refetchMock }) as never,
    )
    vi.mocked(useRecordPayment).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load AP')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
