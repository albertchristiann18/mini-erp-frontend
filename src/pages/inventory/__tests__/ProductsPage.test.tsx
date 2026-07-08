import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeAll } from 'vitest'
import ProductsPage from '../ProductsPage'

vi.mock('../../../hooks/api/useInventory', () => ({
  useProducts: vi.fn(),
  useCategories: vi.fn(),
  useBulkCreateProducts: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useProducts, useCategories, useBulkCreateProducts } from '../../../hooks/api/useInventory'
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

const mockCategoriesData = {
  results: [
    { id: 'cat1', name: 'Apparel', company: 'c1', category_code: 'AP', description: '', is_active: true, cdate: '', udate: '' },
    { id: 'cat2', name: 'Electronics', company: 'c1', category_code: 'EL', description: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 2, next: null, previous: null,
}

const mockProductsData = {
  results: [],
  count: 0, next: null, previous: null,
}

function hookResult(data: unknown) {
  return { data, isLoading: false, refetch: vi.fn() } as never
}

function setupMocks() {
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useProducts).mockReturnValue(hookResult(mockProductsData))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategoriesData))
  vi.mocked(useBulkCreateProducts).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as never)
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders search input and category select', () => {
  setupMocks()
  renderPage()

  expect(screen.getByPlaceholderText('Search by name or SKU...')).toBeInTheDocument()
  screen.getByRole('combobox')
})

it('selecting a category calls useProducts with the correct category id', async () => {
  setupMocks()
  renderPage()

  vi.mocked(useProducts).mockClear()

  const comboboxes = screen.getAllByRole('combobox')
  await userEvent.click(comboboxes[0])
  await userEvent.click(screen.getByRole('option', { name: /^apparel$/i }))

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[3]).toBe('cat1')
  })
})

it('clicking Name header sorts ascending, then descending, then clears', async () => {
  setupMocks()
  renderPage()

  const nameHeader = screen.getByText('Name')

  vi.mocked(useProducts).mockClear()

  await userEvent.click(nameHeader)

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[4]).toBe('name')
  })

  vi.mocked(useProducts).mockClear()
  await userEvent.click(nameHeader)

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[4]).toBe('-name')
  })

  vi.mocked(useProducts).mockClear()
  await userEvent.click(nameHeader)

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[4]).toBeUndefined()
  })
})

it('search only queries on Enter or button click', async () => {
  setupMocks()
  renderPage()

  vi.mocked(useProducts).mockClear()

  const input = screen.getByPlaceholderText('Search by name or SKU...')
  await userEvent.type(input, 'test-product')

  const callsAfterType = vi.mocked(useProducts).mock.calls
  const lastAfterType = callsAfterType[callsAfterType.length - 1]
  expect(lastAfterType[2]).toBeUndefined()

  await userEvent.keyboard('{Enter}')

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[2]).toBe('test-product')
  })
})

it('changing category resets page to 1', async () => {
  setupMocks()
  renderPage()

  vi.mocked(useProducts).mockClear()

  const comboboxes = screen.getAllByRole('combobox')
  await userEvent.click(comboboxes[0])
  await userEvent.click(screen.getByRole('option', { name: /^apparel$/i }))

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[0]).toBe(1)
  })
})
