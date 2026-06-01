import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import { PurchaseOrderFormModal } from '../PurchaseOrderFormModal'

vi.mock('../../../hooks/useInventory', () => ({
  useWarehouses: () => ({ data: { results: [{ id: 'w1', name: 'Main WH' }] } }),
}))

vi.mock('../../../hooks/usePurchasing', () => ({
  useCreatePurchaseOrder: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../../features/purchasing/VariantSearchSelect', () => ({
  VariantSearchSelect: ({ placeholder }: { placeholder?: string }) => (
    <div>{placeholder ?? 'Select variant'}</div>
  ),
}))

function renderModal(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PurchaseOrderFormModal open={open} onClose={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('shows discount column when Has Discount is checked', async () => {
  renderModal()
  expect(screen.getByText('New Purchase Order')).toBeInTheDocument()

  const checkbox = screen.getByLabelText('Has Discount')
  expect(checkbox).not.toBeChecked()

  expect(screen.getAllByRole('spinbutton')).toHaveLength(3)

  await userEvent.click(checkbox)
  expect(checkbox).toBeChecked()

  expect(screen.getAllByRole('spinbutton')).toHaveLength(4)
})
