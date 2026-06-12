import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeAll } from 'vitest'
import ProductsPage from '../ProductsPage'

vi.mock('../../../hooks/useInventory', () => ({
  useProducts: vi.fn(),
  useCategories: vi.fn(),
  useBulkCreateProducts: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useProducts, useCategories, useBulkCreateProducts } from '../../../hooks/useInventory'
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

it('renders search input, category select, sort select', () => {
  setupMocks()
  renderPage()

  expect(screen.getByPlaceholderText('Search by name or SKU...')).toBeInTheDocument()
  const comboboxes = screen.getAllByRole('combobox')
  expect(comboboxes).toHaveLength(2)
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

it('changing sort calls useProducts with the correct ordering value', async () => {
  setupMocks()
  renderPage()

  vi.mocked(useProducts).mockClear()

  const comboboxes = screen.getAllByRole('combobox')
  await userEvent.click(comboboxes[1])
  await userEvent.click(screen.getByRole('option', { name: /^name a→z$/i }))

  await waitFor(() => {
    const calls = vi.mocked(useProducts).mock.calls
    const lastCall = calls[calls.length - 1]
    expect(lastCall[4]).toBe('name')
  })
})

it('changing any filter resets page to 1', async () => {
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
