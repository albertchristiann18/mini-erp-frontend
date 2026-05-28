import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, beforeAll } from 'vitest'
import { BulkStockModal } from '../BulkStockModal'

vi.mock('../../../hooks/useInventory', () => ({
  useAllVariants: vi.fn(),
  useWarehouses: vi.fn(),
  useBulkUpdateInventory: vi.fn(),
}))

import { useAllVariants, useWarehouses, useBulkUpdateInventory } from '../../../hooks/useInventory'

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

const mockVariants = {
  results: [
    { id: 'v1', name: 'Red Shirt', sku_variant_code: 'RS-001', product: 'p1', product_name: 'Shirt', company: 'c1', sku: 'SHT', base_price: 100, total_available_qty: 10, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
    { id: 'v2', name: 'Blue Shirt', sku_variant_code: 'BS-002', product: 'p1', product_name: 'Shirt', company: 'c1', sku: 'SHT', base_price: 100, total_available_qty: 5, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
    { id: 'v3', name: 'Green Pants', sku_variant_code: 'GP-003', product: 'p2', product_name: 'Pants', company: 'c1', sku: 'PNT', base_price: 200, total_available_qty: 3, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
  ],
  count: 3, next: null, previous: null,
}

const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 1, next: null, previous: null,
}

function renderModal() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <BulkStockModal open={true} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false }) as never

it('renders search input and shows dropdown on focus', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  expect(input).toBeInTheDocument()

  await userEvent.click(input)

  expect(screen.getByText('Shirt · Red Shirt')).toBeInTheDocument()
})

it('filters variants by SKU', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.type(input, 'RS-001')

  expect(screen.getByText('Shirt · Red Shirt')).toBeInTheDocument()
  expect(screen.queryByText('Blue Shirt')).not.toBeInTheDocument()
  expect(screen.queryByText('Green Pants')).not.toBeInTheDocument()
})

it('filters variants by name', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.type(input, 'Green')

  expect(screen.getByText('Pants · Green Pants')).toBeInTheDocument()
  expect(screen.queryByText('Red Shirt')).not.toBeInTheDocument()
  expect(screen.queryByText('Blue Shirt')).not.toBeInTheDocument()
})

it('selects variant on click and shows selected value in input', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.click(screen.getByText('Shirt · Red Shirt'))

  expect(input).toHaveValue('Shirt · Red Shirt')
})

it('pressing Enter selects the first matching variant', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.type(input, 'Blue')

  await userEvent.keyboard('{Enter}')

  expect(input).toHaveValue('Shirt · Blue Shirt')
})

it('shows SKU code below the name in the dropdown', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)

  const skuRS = screen.getByText('RS-001')
  expect(skuRS).toBeInTheDocument()
  expect(skuRS.className).toContain('font-mono')

  expect(screen.getByText('BS-002')).toBeInTheDocument()
  expect(screen.getByText('GP-003')).toBeInTheDocument()
})

it('Escape closes the dropdown without selecting', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)

  expect(screen.getByText('Shirt · Red Shirt')).toBeInTheDocument()

  await userEvent.keyboard('{Escape}')

  expect(screen.queryByText('Shirt · Red Shirt')).not.toBeInTheDocument()
  expect(input).toHaveValue('')
})

it('shows "No variants found" when filter matches nothing', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.type(input, 'ZZZZ')

  expect(screen.getByText('No variants found')).toBeInTheDocument()
})

it('preview section is hidden when no valid rows exist', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  expect(screen.queryByText(/changes? ready/i)).not.toBeInTheDocument()
})

it('preview appears (collapsed header) when valid rows exist', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.click(screen.getByText('Shirt · Red Shirt'))

  const warehouseTrigger = screen.getAllByRole('combobox')[0]
  await userEvent.click(warehouseTrigger)
  await userEvent.click(screen.getByRole('option', { name: /Warehouse A/ }))

  const qtyInput = screen.getAllByRole('spinbutton')[0]
  await userEvent.clear(qtyInput)
  await userEvent.type(qtyInput, '10')

  expect(screen.getByText(/1 change ready/i)).toBeInTheDocument()
})

it('clicking the toggle expands the preview showing variant name and warehouse', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const input = screen.getByPlaceholderText('Search variant...')
  await userEvent.click(input)
  await userEvent.click(screen.getByText('Shirt · Red Shirt'))

  const warehouseTrigger = screen.getAllByRole('combobox')[0]
  await userEvent.click(warehouseTrigger)
  await userEvent.click(screen.getByRole('option', { name: /Warehouse A/ }))

  const qtyInput = screen.getAllByRole('spinbutton')[0]
  await userEvent.clear(qtyInput)
  await userEvent.type(qtyInput, '10')

  const header = screen.getByText('1 change ready')
  await userEvent.click(header)
  await userEvent.click(header)

  expect(screen.getAllByText(/Shirt · Red Shirt/).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/Warehouse A/).length).toBeGreaterThan(0)
})

it('"Update Stock" button is disabled when no valid rows', async () => {
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderModal()

  const updateButton = screen.getByRole('button', { name: /update stock/i })
  expect(updateButton).toBeDisabled()
})
