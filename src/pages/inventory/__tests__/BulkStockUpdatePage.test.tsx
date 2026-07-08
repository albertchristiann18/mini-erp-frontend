import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import BulkStockUpdatePage from '../BulkStockUpdatePage'

vi.mock('../../../hooks/api/useInventory', () => ({
  useWarehouses: vi.fn(),
  useBulkUpdateInventory: vi.fn(),
}))

vi.mock('../../../api/inventory', () => ({
  getProductVariantStocks: vi.fn(),
}))

import { useWarehouses, useBulkUpdateInventory } from '../../../hooks/api/useInventory'
import { getProductVariantStocks } from '../../../api/inventory'

const mockVariants = {
  results: [
    { id: 'v1', name: 'Red', product_name: 'Shirt', sku_variant_code: 'SHT-RED', product: 'p1', product_sku: 'SHT', category_name: 'Apparel', base_price: 100, total_available_qty: 50, physical_qty: 50, is_active: true },
    { id: 'v2', name: 'Blue', product_name: 'Shirt', sku_variant_code: 'SHT-BLU', product: 'p1', product_sku: 'SHT', category_name: 'Apparel', base_price: 100, total_available_qty: 30, physical_qty: 30, is_active: true },
    { id: 'v3', name: 'Large', product_name: 'Pants', sku_variant_code: 'PNT-LRG', product: 'p2', product_sku: 'PNT', category_name: 'Apparel', base_price: 200, total_available_qty: 20, physical_qty: 20, is_active: true },
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
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()
  expect(screen.getByRole('button', { name: /back to stock/i })).toBeInTheDocument()
})

it('searching with Enter shows results', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: { results: mockVariants.results.slice(0, 2), count: 2, next: null, previous: null } } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')

  expect(await screen.findByText(/Shirt · Red/)).toBeInTheDocument()
  expect(await screen.findByText(/Shirt · Blue/)).toBeInTheDocument()
  expect(screen.queryByText(/Pants · Large/)).not.toBeInTheDocument()
})

it('clicking "Add" on a result adds a row to the table', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: mockVariants } as never)
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
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: mockVariants } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync, isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  const warehouseTriggers = screen.getAllByRole('combobox')
  await userEvent.click(warehouseTriggers[0])
  await userEvent.click(screen.getByRole('option', { name: /warehouse a/i }))

  const qtyInput = screen.getByRole('spinbutton')
  await userEvent.type(qtyInput, '10')

  await userEvent.click(screen.getByRole('button', { name: /update/i }))

  expect(mutateAsync).toHaveBeenCalledWith([
    { variant_id: 'v1', warehouse_id: 'w1', qty: 10, type: 'add' },
  ])
})

it('shows current stock column after adding a variant', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: { results: [mockVariants.results[0]], count: 1, next: null, previous: null } } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')

  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  expect(screen.getByText('Current QTY')).toBeInTheDocument()
  expect(screen.getByText('50')).toBeInTheDocument()
})

it('shows correct After value for Add type', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: { results: [mockVariants.results[0]], count: 1, next: null, previous: null } } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  const warehouseTriggers = screen.getAllByRole('combobox')
  await userEvent.click(warehouseTriggers[0])
  await userEvent.click(screen.getByRole('option', { name: /warehouse a/i }))

  const qtyInput = screen.getByRole('spinbutton')
  await userEvent.type(qtyInput, '10')

  expect(screen.getByText('60')).toBeInTheDocument()
})

it('shows correct After value for Set type', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: { results: [mockVariants.results[0]], count: 1, next: null, previous: null } } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Shirt')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  const triggers = screen.getAllByRole('combobox')
  await userEvent.click(triggers[0])
  await userEvent.click(screen.getByRole('option', { name: /warehouse a/i }))

  await userEvent.click(triggers[1])
  await userEvent.click(screen.getByRole('option', { name: /set/i }))

  const qtyInput = screen.getByRole('spinbutton')
  await userEvent.type(qtyInput, '30')

  expect(screen.getByText('30')).toBeInTheDocument()
})

it('shows correct After value for Remove type and highlights red when negative', async () => {
  vi.mocked(getProductVariantStocks).mockResolvedValue({ data: { results: [mockVariants.results[2]], count: 1, next: null, previous: null } } as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const input = screen.getByPlaceholderText('Search by product name or SKU...')
  await userEvent.type(input, 'Pants')
  await userEvent.keyboard('{Enter}')
  await userEvent.click(screen.getAllByRole('button', { name: /\+ add/i })[0])

  const triggers = screen.getAllByRole('combobox')
  await userEvent.click(triggers[0])
  await userEvent.click(screen.getByRole('option', { name: /warehouse a/i }))

  await userEvent.click(triggers[1])
  await userEvent.click(screen.getByRole('option', { name: /remove/i }))

  const qtyInput = screen.getByRole('spinbutton')
  await userEvent.type(qtyInput, '30')

  const afterCell = screen.getByText('0')
  expect(afterCell).toBeInTheDocument()
  expect(afterCell).toHaveClass('text-red-600')
})
