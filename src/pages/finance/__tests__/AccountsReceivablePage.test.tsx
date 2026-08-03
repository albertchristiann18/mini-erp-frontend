import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe } from 'vitest'
import AccountsReceivablePage from '../AccountsReceivablePage'

vi.mock('../../../hooks/api/useFinance', () => ({
  useAccountsReceivable: vi.fn(),
  useSettleReceivable: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAccountsReceivable, useSettleReceivable } from '../../../hooks/api/useFinance'
import { useAuth } from '../../../contexts/AuthContext'

const mockARData = {
  results: [
    {
      id: 'ar1',
      order_number: 'ORD-001',
      status: 'PENDING' as const,
      expected_amount: 500000,
      settled_amount: 0,
      due_date: '2026-08-01',
      cdate: '2026-07-01T10:00:00Z',
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
        <AccountsReceivablePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AccountsReceivablePage', () => {
  it('renders AR rows on happy path', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsReceivable).mockReturnValue(
      ({ data: mockARData, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useSettleReceivable).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText('ORD-001')).toBeInTheDocument()
  })

  it('shows loading indicator while fetching', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsReceivable).mockReturnValue(
      ({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useSettleReceivable).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows empty state when no records exist', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsReceivable).mockReturnValue(
      ({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useSettleReceivable).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText(/no receivable/i)).toBeInTheDocument()
  })

  it('shows error state with message and retry when fetch fails', () => {
    const refetchMock = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useAccountsReceivable).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Failed to load AR' }, refetch: refetchMock }) as never,
    )
    vi.mocked(useSettleReceivable).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load AR')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
