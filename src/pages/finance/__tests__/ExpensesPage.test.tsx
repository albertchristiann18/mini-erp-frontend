import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe } from 'vitest'
import ExpensesPage from '../ExpensesPage'

vi.mock('../../../hooks/api/useFinance', () => ({
  useExpenses: vi.fn(),
  useCreateExpense: vi.fn(),
  useUpdateExpense: vi.fn(),
  useExpenseCategories: vi.fn().mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useExpenses, useCreateExpense, useUpdateExpense } from '../../../hooks/api/useFinance'
import { useAuth } from '../../../contexts/AuthContext'

const mockExpenseData = {
  results: [
    {
      id: 'exp1',
      expense_number: 'EXP-001',
      category: 'cat1',
      category_name: 'Office Supplies',
      description: 'Pens and paper',
      payment_method: 'CASH',
      amount: 150000,
      expense_date: '2026-07-01',
      note: '',
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
        <ExpensesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const happyResult = () =>
  ({ data: mockExpenseData, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never

describe('ExpensesPage', () => {
  it('renders expense rows on happy path', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useExpenses).mockReturnValue(happyResult())
    vi.mocked(useCreateExpense).mockReturnValue(mockMutation)
    vi.mocked(useUpdateExpense).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText('Pens and paper')).toBeInTheDocument()
    expect(screen.getByText('Office Supplies')).toBeInTheDocument()
  })

  it('shows loading indicator while fetching', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useExpenses).mockReturnValue(
      ({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useCreateExpense).mockReturnValue(mockMutation)
    vi.mocked(useUpdateExpense).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows empty state when no expenses exist', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useExpenses).mockReturnValue(
      ({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false, isError: false, error: null, refetch: vi.fn() }) as never,
    )
    vi.mocked(useCreateExpense).mockReturnValue(mockMutation)
    vi.mocked(useUpdateExpense).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByText(/no expenses/i)).toBeInTheDocument()
  })

  it('shows error state with message and retry when fetch fails', () => {
    const refetchMock = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: true } } as never)
    vi.mocked(useExpenses).mockReturnValue(
      ({ data: undefined, isLoading: false, isError: true, error: { status: 500, message: 'Failed to load expenses' }, refetch: refetchMock }) as never,
    )
    vi.mocked(useCreateExpense).mockReturnValue(mockMutation)
    vi.mocked(useUpdateExpense).mockReturnValue(mockMutation)
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Failed to load expenses')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
