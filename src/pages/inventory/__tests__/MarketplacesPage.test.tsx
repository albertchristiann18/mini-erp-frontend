import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import MarketplacesPage from '../MarketplacesPage'

const mockUseMarketplaces = vi.fn()
const mockUseCreateMarketplace = vi.fn()
const mockUseUpdateMarketplace = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useMarketplaces: (...args: unknown[]) => mockUseMarketplaces(...args),
  useCreateMarketplace: (...args: unknown[]) => mockUseCreateMarketplace(...args),
  useUpdateMarketplace: (...args: unknown[]) => mockUseUpdateMarketplace(...args),
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
  { id: 'm1', name: 'Shopee', url: 'https://shopee.com', status: 'active', is_active: true, connected_time: null },
  { id: 'm2', name: 'Tokopedia', url: null, status: 'active', is_active: true, connected_time: null },
]

it('test_renders_list', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false })
  mockUseCreateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Shopee')).toBeInTheDocument()
  expect(screen.getByText('Tokopedia')).toBeInTheDocument()
})

it('test_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseMarketplaces.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseCreateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('No marketplaces yet')).toBeInTheDocument()
})

it('test_shows_new_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseMarketplaces.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseCreateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('New Marketplace')).toBeInTheDocument()
})

it('test_hides_new_button_for_non_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false } })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null }, isLoading: false })
  mockUseCreateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateMarketplace.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.queryByText('New Marketplace')).not.toBeInTheDocument()
})
