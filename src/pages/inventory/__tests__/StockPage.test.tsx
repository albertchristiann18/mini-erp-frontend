import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeAll } from 'vitest'
import StockPage from '../StockPage'

vi.mock('../../../hooks/useInventory', () => ({
  useProductVariantStocks: vi.fn(),
  useWarehouses: vi.fn(),
  useAdjustStock: vi.fn(),
  useProductVariants: vi.fn(),
  useAllVariants: vi.fn(),
  useBulkUpdateInventory: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useProductVariantStocks, useWarehouses, useAdjustStock, useProductVariants, useAllVariants, useBulkUpdateInventory } from '../../../hooks/useInventory'
import { useAuth } from '../../../contexts/AuthContext'

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

const mockAuth = { user: { is_staff: true }, isLoading: false }
const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
    { id: 'w2', name: 'Warehouse B', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 2, next: null, previous: null,
}
const mockStockData = {
  results: [],
  count: 0, next: null, previous: null,
}
const mockProductVariants = {
  results: [],
  count: 0, next: null, previous: null,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <StockPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const hookResult = (data: unknown) => ({ data, isLoading: false, refetch: vi.fn() }) as never

it('renders "Bulk Update" button (not "Bulk Import")', () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()
  expect(screen.getByRole('button', { name: /bulk update/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /bulk import/i })).not.toBeInTheDocument()
})

const mockStockWithVariants = {
  results: [
    { id: 'v1', name: 'Red Shirt', sku_variant_code: 'RS-001', product: 'p1', product_name: 'Shirt', product_sku: 'SHT', category_name: 'Apparel', base_price: 100, total_available_qty: 10, physical_qty: 10, is_active: true },
    { id: 'v2', name: 'Blue Shirt', sku_variant_code: 'BS-002', product: 'p1', product_name: 'Shirt', product_sku: 'SHT', category_name: 'Apparel', base_price: 100, total_available_qty: 5, physical_qty: 5, is_active: true },
  ],
  count: 2, next: null, previous: null,
}

async function selectWarehouse(warehouseName: string) {
  const warehouseTrigger = screen.getByRole('combobox')
  await userEvent.click(warehouseTrigger)
  await userEvent.click(screen.getByRole('option', { name: new RegExp(`^${warehouseName}$`, 'i') }))
}

async function openBulkEditModal() {
  await selectWarehouse('Warehouse A')
  const checkboxes = screen.getAllByRole('checkbox')
  await userEvent.click(checkboxes[0])
  await userEvent.click(screen.getByRole('button', { name: /bulk edit stock/i }))
}

it('BulkEditModal shows "Show ▼" toggle and the list is hidden by default', async () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockWithVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  await openBulkEditModal()

  const dialog = screen.getByRole('dialog')
  const toggle = within(dialog).getByRole('button', { name: /show ▼/i })
  expect(toggle).toBeInTheDocument()
  expect(within(dialog).queryByText('RS-001')).not.toBeInTheDocument()
})

it('BulkEditModal clicking the toggle reveals the variant list with current stock', async () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockWithVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  await openBulkEditModal()

  const dialog = screen.getByRole('dialog')
  const toggle = within(dialog).getByRole('button', { name: /show ▼/i })
  await userEvent.click(toggle)

  expect(within(dialog).getByText('RS-001')).toBeInTheDocument()
  expect(within(dialog).getByText('BS-002')).toBeInTheDocument()
})

it('BulkEditModal when qty entered shows current → new stock arrows', async () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockWithVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  await openBulkEditModal()

  const dialog = screen.getByRole('dialog')
  const toggle = within(dialog).getByRole('button', { name: /show ▼/i })
  await userEvent.click(toggle)

  const qtyInput = within(dialog).getByPlaceholderText('Enter quantity')
  await userEvent.type(qtyInput, '5')

  expect(within(dialog).getByText('15')).toBeInTheDocument()
})

it('BulkEditModal old standalone preview section is gone', async () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockWithVariants))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  await openBulkEditModal()

  const dialog = screen.getByRole('dialog')
  expect(within(dialog).queryByText(/^preview$/i)).not.toBeInTheDocument()
})

describe('inline +/−/= buttons', () => {
  function setupStockMocks() {
    vi.mocked(useAuth).mockReturnValue(mockAuth as never)
    vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockWithVariants))
    vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
    vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
    vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
    vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
    vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  }

  // Helper: get the first variant row (scoped context)
  async function getFirstRow() {
    const row = screen.getByText('RS-001').closest('tr')!
    return { row, withinRow: within(row) }
  }

  it('"+" button locks type as "add" — only + button remains, others hidden', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '5')

    const addBtn = screen.getAllByTitle('Add')[0]
    await userEvent.click(addBtn)

    const { withinRow } = await getFirstRow()
    expect(screen.getByText(/save all/i)).toBeInTheDocument()
    expect(withinRow.getByTitle('Add')).toBeInTheDocument()
    expect(withinRow.queryByTitle('Subtract')).not.toBeInTheDocument()
    expect(withinRow.queryByTitle('Set to')).not.toBeInTheDocument()
  })

  it('qty input stays visible after clicking + button', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '5')

    const addBtn = screen.getAllByTitle('Add')[0]
    await userEvent.click(addBtn)

    const { withinRow } = await getFirstRow()
    expect(withinRow.getByDisplayValue('5')).toBeInTheDocument()
  })

  it('preview updates when qty input changes after type is locked', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '5')

    const addBtn = screen.getAllByTitle('Add')[0]
    await userEvent.click(addBtn)

    const { withinRow } = await getFirstRow()
    expect(withinRow.getByText('15')).toBeInTheDocument()

    const stillVisibleInput = withinRow.getByDisplayValue('5')
    await userEvent.clear(stillVisibleInput)
    await userEvent.type(stillVisibleInput, '3')

    expect(withinRow.getByText('13')).toBeInTheDocument()
  })

  it('clicking X (unstage) clears the locked type and restores all 3 buttons', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '5')
    const addBtn = screen.getAllByTitle('Add')[0]
    await userEvent.click(addBtn)

    const { withinRow } = await getFirstRow()
    const saveBtn = withinRow.getByText('Save').closest('button')!
    const unstageBtn = saveBtn.parentElement!.querySelector('button:last-child')!
    await userEvent.click(unstageBtn)

    expect(withinRow.getByTitle('Add')).toBeInTheDocument()
    expect(withinRow.getByTitle('Subtract')).toBeInTheDocument()
    expect(withinRow.getByTitle('Set to')).toBeInTheDocument()
  })

  it('"−" button locks type as "min" — only − button remains', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '3')

    const subBtn = screen.getAllByTitle('Subtract')[0]
    await userEvent.click(subBtn)

    const { withinRow } = await getFirstRow()
    expect(screen.getByText(/save all/i)).toBeInTheDocument()
    expect(withinRow.getByTitle('Subtract')).toBeInTheDocument()
    expect(withinRow.queryByTitle('Add')).not.toBeInTheDocument()
    expect(withinRow.queryByTitle('Set to')).not.toBeInTheDocument()
  })

  it('"=" button locks type as "set" — only = button remains', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '10')

    const setBtn = screen.getAllByTitle('Set to')[0]
    await userEvent.click(setBtn)

    const { withinRow } = await getFirstRow()
    expect(screen.getByText(/save all/i)).toBeInTheDocument()
    expect(withinRow.getByTitle('Set to')).toBeInTheDocument()
    expect(withinRow.queryByTitle('Add')).not.toBeInTheDocument()
    expect(withinRow.queryByTitle('Subtract')).not.toBeInTheDocument()
  })

  it('pressing Enter in qty input locks type as "add"', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const qtyInput = screen.getAllByPlaceholderText('Qty')[0]
    await userEvent.type(qtyInput, '7')
    await userEvent.keyboard('{Enter}')

    const { withinRow } = await getFirstRow()
    expect(screen.getByText(/save all/i)).toBeInTheDocument()
    expect(withinRow.getByTitle('Add')).toBeInTheDocument()
    expect(withinRow.queryByTitle('Subtract')).not.toBeInTheDocument()
    expect(withinRow.queryByTitle('Set to')).not.toBeInTheDocument()
  })

  it('+/−/= buttons are disabled when qty input is empty', async () => {
    setupStockMocks()
    renderPage()
    await selectWarehouse('Warehouse A')

    const addBtns = screen.getAllByTitle('Add')
    const subBtns = screen.getAllByTitle('Subtract')
    const setBtns = screen.getAllByTitle('Set to')

    for (const btn of [...addBtns, ...subBtns, ...setBtns]) {
      expect(btn).toBeDisabled()
    }
  })

  it('no "Stage" button exists', () => {
    setupStockMocks()
    renderPage()
    expect(screen.queryByRole('button', { name: /stage/i })).not.toBeInTheDocument()
  })
})

it('has "All Warehouses" as the first SelectItem in the warehouse dropdown', async () => {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  vi.mocked(useProductVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useAllVariants).mockReturnValue(hookResult(mockProductVariants))
  vi.mocked(useBulkUpdateInventory).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
  renderPage()

  const warehouseTrigger = screen.getByRole('combobox')
  await userEvent.click(warehouseTrigger)

  expect(screen.getByRole('option', { name: /^all warehouses$/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /^warehouse a$/i })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: /^warehouse b$/i })).toBeInTheDocument()
})
