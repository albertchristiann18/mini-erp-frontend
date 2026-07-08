import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import MarketplacesPage from '../MarketplacesPage'

const mockUseCompanyMarketplaces = vi.fn()
const mockUseCreateCompanyMarketplace = vi.fn()
const mockUseUpdateCompanyMarketplace = vi.fn()
const mockUseDeleteCompanyMarketplace = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/api/useInventory', () => ({
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

it('test_renders_list', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false })
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Shopee')).toBeInTheDocument()
  expect(screen.getByText('Tokopedia')).toBeInTheDocument()
})

it('test_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('No marketplaces yet')).toBeInTheDocument()
})

it('test_shows_new_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('New Marketplace')).toBeInTheDocument()
})

it('test_hides_new_button_for_non_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false } })
  mockUseCompanyMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false })
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.queryByText('New Marketplace')).not.toBeInTheDocument()
})

it('test_shows_delete_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseCompanyMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false })
  mockUseCreateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseDeleteCompanyMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  const { container } = renderPage()

  expect(container.querySelector('.lucide-trash2')).toBeInTheDocument()
})
