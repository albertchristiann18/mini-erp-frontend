import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import MarketplacesPage from '../MarketplacesPage'

const mockUseCompanyMarketplaces = vi.fn()
const mockUseCreateCompanyMarketplace = vi.fn()
const mockUseUpdateCompanyMarketplace = vi.fn()
const mockUseDeleteCompanyMarketplace = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/api/inventory', () => ({
  useCompanyMarketplaces: (...args: unknown[]) => mockUseCompanyMarketplaces(...args),
  useCreateCompanyMarketplace: (...args: unknown[]) => mockUseCreateCompanyMarketplace(...args),
  useUpdateCompanyMarketplace: (...args: unknown[]) => mockUseUpdateCompanyMarketplace(...args),
  useDeleteCompanyMarketplace: (...args: unknown[]) => mockUseDeleteCompanyMarketplace(...args),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarketplacesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const mockMarketplaces = [
  { id: 'm1', company_id: 'c1', name: 'Shopee', is_active: true, cdate: '', udate: '' },
  { id: 'm2', company_id: 'c1', name: 'Tokopedia', is_active: true, cdate: '', udate: '' },
]

const baseListHook = { data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false, isError: false, error: null, refetch: vi.fn() }
const emptyListHook = { data: { results: [], count: 0, next: null, previous: null }, isLoading: false, isError: false, error: null, refetch: vi.fn() }
const baseMutateMock = { mutateAsync: vi.fn(), isPending: false }

it('test_renders_list', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(baseListHook)
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  expect(screen.getByText('Shopee')).toBeInTheDocument()
  expect(screen.getByText('Tokopedia')).toBeInTheDocument()
})

it('test_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(emptyListHook)
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  expect(screen.getByText('No marketplaces yet')).toBeInTheDocument()
})

it('test_shows_new_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(emptyListHook)
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  expect(screen.getByText('New Marketplace')).toBeInTheDocument()
})

it('test_hides_new_button_for_non_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false } })
  mockUseCompanyMarketplaces.mockReturnValue({ ...baseListHook })
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  expect(screen.queryByText('New Marketplace')).not.toBeInTheDocument()
})

it('test_shows_delete_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(baseListHook)
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  const { container } = renderPage()

  expect(container.querySelector('.lucide-trash2')).toBeInTheDocument()
})

it('shows error state when list query fails', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: { status: 500, message: 'Server error' },
    refetch: vi.fn(),
  })
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText('Server error')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})

it('shows name required validation error when form submitted empty', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(emptyListHook)
  mockUseCreateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /new marketplace/i }))
  await userEvent.click(screen.getByRole('button', { name: /create/i }))

  expect(await screen.findByText('Name is required')).toBeInTheDocument()
})

it('disables submit button while request is in flight', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue(emptyListHook)
  const mutateAsync = vi.fn(() => new Promise(() => { /* never resolves */ }))
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync, isPending: true })
  mockUseUpdateCompanyMarketplace.mockReturnValue(baseMutateMock)
  mockUseDeleteCompanyMarketplace.mockReturnValue(baseMutateMock)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /new marketplace/i }))

  const submitBtn = screen.getByRole('button', { name: /saving/i })
  expect(submitBtn).toBeDisabled()
})
