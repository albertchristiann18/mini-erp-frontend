/**
 * Tests covering the applyApiErrors wiring in the three finance form modals.
 * The generic applyApiErrors helper is unit-tested separately; these tests
 * verify each modal correctly surfaces server field errors on the right fields
 * and toasts non-field errors.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, describe, beforeAll } from 'vitest'
import { ExpenseFormModal } from '../ExpenseFormModal'
import { RecordPaymentModal } from '../RecordPaymentModal'
import { SettleReceivableModal } from '../SettleReceivableModal'

// Pointer event polyfill for Radix Select/Dialog
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn()
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn()
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
})

vi.mock('../../../hooks/api/useFinance', () => ({
  useExpenseCategories: vi.fn(),
  useCreateExpense: vi.fn(),
  useUpdateExpense: vi.fn(),
  useRecordPayment: vi.fn(),
  useSettleReceivable: vi.fn(),
}))

vi.mock('../../../lib/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  useExpenseCategories, useCreateExpense, useUpdateExpense, useRecordPayment, useSettleReceivable,
} from '../../../hooks/api/useFinance'
import { toast } from '../../../lib/toast'
import type { Expense } from '../../../types/finance'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

// ─── ExpenseFormModal ────────────────────────────────────────────────────────

const stubExpense: Expense = {
  id: 'exp1',
  company: 'company1',
  expense_number: 'EXP-001',
  category: 'cat1',
  category_name: 'Supplies',
  description: 'Office pens',
  payment_method: 'CASH',
  amount: 50000,
  expense_date: '2026-07-01',
  is_recurring: false,
  note: '',
  cdate: '2026-07-01T00:00:00Z',
  udate: '2026-07-01T00:00:00Z',
}

describe('ExpenseFormModal — applyApiErrors wiring', () => {
  it('surfaces field error on description field when server returns fieldErrors', async () => {
    vi.mocked(useExpenseCategories).mockReturnValue(
      ({ data: { results: [{ id: 'cat1', name: 'Supplies' }], count: 1, next: null, previous: null } }) as never,
    )
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 400,
      message: 'Validation failed.',
      fieldErrors: { description: 'Description too short.' },
    })
    vi.mocked(useCreateExpense).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useUpdateExpense).mockReturnValue({ mutateAsync, isPending: false } as never)

    // Use the edit path so all required fields are pre-filled via defaultValues
    render(<ExpenseFormModal open={true} onClose={vi.fn()} expense={stubExpense} />, { wrapper })

    // Submit the pre-filled form — should pass client validation and hit server
    await userEvent.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => {
      expect(screen.getByText('Description too short.')).toBeInTheDocument()
    })
  })

  it('calls toast.error for non-field API error', async () => {
    vi.mocked(useExpenseCategories).mockReturnValue(
      ({ data: { results: [{ id: 'cat1', name: 'Supplies' }], count: 1, next: null, previous: null } }) as never,
    )
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 500,
      message: 'Server error.',
    })
    vi.mocked(useCreateExpense).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useUpdateExpense).mockReturnValue({ mutateAsync, isPending: false } as never)

    render(<ExpenseFormModal open={true} onClose={vi.fn()} expense={stubExpense} />, { wrapper })

    await userEvent.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalled()
    })
  })
})

// ─── RecordPaymentModal ──────────────────────────────────────────────────────

describe('RecordPaymentModal — applyApiErrors wiring', () => {
  it('surfaces field error on amount field when server returns fieldErrors', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 400,
      message: 'Validation failed.',
      fieldErrors: { amount: 'Amount exceeds remaining balance.' },
    })
    vi.mocked(useRecordPayment).mockReturnValue({ mutateAsync, isPending: false } as never)

    render(
      <RecordPaymentModal open={true} onClose={vi.fn()} apId="ap1" remainingAmount={500000} />,
      { wrapper },
    )

    const amountInput = screen.getByPlaceholderText('0')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100000')

    await userEvent.click(screen.getByRole('button', { name: /record payment/i }))

    await waitFor(() => {
      expect(screen.getByText('Amount exceeds remaining balance.')).toBeInTheDocument()
    })
  })

  it('calls toast.error for non-field API error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 500,
      message: 'Server error.',
    })
    vi.mocked(useRecordPayment).mockReturnValue({ mutateAsync, isPending: false } as never)

    render(
      <RecordPaymentModal open={true} onClose={vi.fn()} apId="ap1" remainingAmount={500000} />,
      { wrapper },
    )

    const amountInput = screen.getByPlaceholderText('0')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100000')

    await userEvent.click(screen.getByRole('button', { name: /record payment/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalled()
    })
  })
})

// ─── SettleReceivableModal ───────────────────────────────────────────────────

describe('SettleReceivableModal — applyApiErrors wiring', () => {
  it('surfaces field error on settled_amount field when server returns fieldErrors', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 400,
      message: 'Validation failed.',
      fieldErrors: { settled_amount: 'Invalid settlement amount.' },
    })
    vi.mocked(useSettleReceivable).mockReturnValue({ mutateAsync, isPending: false } as never)

    render(
      <SettleReceivableModal
        open={true}
        onClose={vi.fn()}
        arId="ar1"
        expectedAmount={1000000}
        settledAmount={0}
      />,
      { wrapper },
    )

    await userEvent.click(screen.getByRole('button', { name: /^settle$/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid settlement amount.')).toBeInTheDocument()
    })
  })

  it('calls toast.error for non-field API error', async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      status: 500,
      message: 'Server error.',
    })
    vi.mocked(useSettleReceivable).mockReturnValue({ mutateAsync, isPending: false } as never)

    render(
      <SettleReceivableModal
        open={true}
        onClose={vi.fn()}
        arId="ar1"
        expectedAmount={1000000}
        settledAmount={0}
      />,
      { wrapper },
    )

    await userEvent.click(screen.getByRole('button', { name: /^settle$/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalled()
    })
  })
})
