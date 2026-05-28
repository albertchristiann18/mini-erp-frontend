import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import BulkStockUpdatePage from '../BulkStockUpdatePage'

vi.mock('../../../hooks/useInventory', () => ({
  useAllVariants: vi.fn(),
  useWarehouses: vi.fn(),
  useBulkUpdateInventory: vi.fn(),
}))

import { useAllVariants, useWarehouses, useBulkUpdateInventory } from '../../../hooks/useInventory'

const mockVariants = {
  results: [
    { id: 'v1', name: 'Red', product_name: 'Shirt', sku_variant_code: 'SHT-RED', product: 'p1', company: 'c1', sku: 'SHT', base_price: 100, total_available_qty: 50, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
    { id: 'v2', name: 'Blue', product_name: 'Shirt', sku_variant_code: 'SHT-BLU', product: 'p1', company: 'c1', sku: 'SHT', base_price: 100, total_available_qty: 30, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
    { id: 'v3', name: 'Large', product_name: 'Pants', sku_variant_code: 'PNT-LRG', product: 'p2', company: 'c1', sku: 'PNT', base_price: 200, total_available_qty: 20, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
  ],
  count: 3, next: null, previous: null,
}

const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
    { id: 'w2', name: 'Warehouse B', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 2, next: null, previous: null,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BulkStockUpdatePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

it('renders "Back to Stock" button', () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()
  expect(screen.getByRole('button', { name: /back to stock/i })).toBeInTheDocument()
})

it('searching with Enter shows results', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')

  expect(screen.getByText(/Shirt · Red/)).toBeInTheDocument()
  expect(screen.getByText(/Shirt · Blue/)).toBeInTheDocument()
  expect(screen.queryByText(/Pants · Large/)).not.toBeInTheDocument()
})

it('clicking "Add" on a result adds a row to the table', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')

  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  expect(screen.getByText('Step 2 — Set Warehouse & Quantity')).toBeInTheDocument()
  expect(screen.getByText('Shirt')).toBeInTheDocument()
})

it('submit calls bulkMutation with correct data for a valid row', async () => {
  const mutateAsync = vi.fn().mockResolvedValue({ summary: { successful: 1, failed: 0 } })
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync, isPending: false } as never)
  renderPage()

  // Search and add a variant
  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  // Select warehouse
  const warehouseTriggers = screen.getAllByRole('combobox')
  await userEvent.click(warehouseTriggers[0])
  await userEvent.click(screen.getByRole('option', { name: /warehouse a/i }))

  // Enter qty
  const qtyInput = screen.getByRole('spinbutton')
  await userEvent.type(qtyInput, '10')

  // Submit
  await userEvent.click(screen.getByRole('button', { name: /update/i }))

  expect(mutateAsync).toHaveBeenCalledWith([
    { variant_id: 'v1', warehouse_id: 'w1', qty: 10, type: 'add' },
  ])
})
