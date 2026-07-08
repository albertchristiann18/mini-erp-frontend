import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
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

const mockData = {
  results: [
    {
      id: 'tx1',
      transaction_date: '2026-05-01',
      description: 'Shopee Withdrawal',
      amount: 5000000,
      transaction_type: 'INFLOW',
      category: 'SALES_SETTLEMENT',
      reference_number: 'REF001',
      note: '',
      cdate: '2026-05-01T10:00:00Z',
      udate: '2026-05-01T10:00:00Z',
    },
    {
      id: 'tx2',
      transaction_date: '2026-05-05',
      description: 'Supplier Payment',
      amount: 2000000,
      transaction_type: 'OUTFLOW',
      category: 'OTHER_EXPENSE',
      reference_number: '',
      note: '',
      cdate: '2026-05-05T10:00:00Z',
      udate: '2026-05-05T10:00:00Z',
    },
  ],
  count: 2,
  next: null,
  previous: null,
}

const mockMutation = { mutateAsync: vi.fn(), isPending: false } as never

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <CashTransactionsPage />
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

it('renders "Cash Transactions" heading', () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  expect(screen.getByText('Cash Transactions')).toBeInTheDocument()
})

it('renders "Shopee Withdrawal" row', () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  expect(screen.getByText('Shopee Withdrawal')).toBeInTheDocument()
})

it('renders "Sales Settlement" as category label for SALES_SETTLEMENT', () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  expect(screen.getByText('Sales Settlement')).toBeInTheDocument()
})

it('inflow amount shows green, outflow shows red', () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument()
  expect(screen.getByText('Rp 2.000.000')).toBeInTheDocument()
})

it('summary strip shows correct totalInflow and totalOutflow', () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  expect(screen.getByText('Rp 5.000.000')).toBeInTheDocument()
  const inflowHeaders = screen.getAllByText('Total Inflow')
  const outflowHeaders = screen.getAllByText('Total Outflow')
  expect(inflowHeaders.length).toBeGreaterThan(0)
  expect(outflowHeaders.length).toBeGreaterThan(0)
})

it('"New Transaction" button opens dialog', async () => {
  vi.mocked(useCashTransactions).mockReturnValue(hookResult(mockData))
  vi.mocked(useCreateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useUpdateCashTransaction).mockReturnValue(mockMutation)
  vi.mocked(useDeleteCashTransaction).mockReturnValue(mockMutation)
  renderPage()
  const btn = screen.getByText('New Transaction')
  await userEvent.click(btn)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})
