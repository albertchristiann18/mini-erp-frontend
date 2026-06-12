import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import BusinessEntitiesPage from '../BusinessEntitiesPage'

const mockUseBusinessEntities = vi.fn()
const mockUseMarketplaces = vi.fn()
const mockUseCreateBusinessEntity = vi.fn()
const mockUseUpdateBusinessEntity = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useBusinessEntities: (...args: unknown[]) => mockUseBusinessEntities(...args),
  useMarketplaces: (...args: unknown[]) => mockUseMarketplaces(...args),
  useCreateBusinessEntity: (...args: unknown[]) => mockUseCreateBusinessEntity(...args),
  useUpdateBusinessEntity: (...args: unknown[]) => mockUseUpdateBusinessEntity(...args),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BusinessEntitiesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const mockEntities = [
  { id: 'be1', company_id: 'c1', name: 'Toko A', marketplace_id: 'm1', marketplace_name: 'Shopee', is_active: true, cdate: '', udate: '' },
  { id: 'be2', company_id: 'c1', name: 'Toko B', marketplace_id: 'm2', marketplace_name: 'Tokopedia', is_active: true, cdate: '', udate: '' },
]

const mockMarketplaces = [
  { id: 'm1', name: 'Shopee', url: null, status: null, is_active: true, connected_time: null },
  { id: 'm2', name: 'Tokopedia', url: null, status: null, is_active: true, connected_time: null },
]

it('test_renders_list', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseBusinessEntities.mockReturnValue({ data: { results: mockEntities, count: 2, next: null, previous: null }, isLoading: false })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null } })
  mockUseCreateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Toko A')).toBeInTheDocument()
  expect(screen.getByText('Toko B')).toBeInTheDocument()
})

it('test_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null } })
  mockUseCreateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('No business entities yet')).toBeInTheDocument()
})

it('test_shows_new_button_for_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null } })
  mockUseCreateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('New Business Entity')).toBeInTheDocument()
})

it('test_hides_new_button_for_non_staff', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false } })
  mockUseBusinessEntities.mockReturnValue({ data: { results: mockEntities, count: 2, next: null, previous: null }, isLoading: false })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null } })
  mockUseCreateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.queryByText('New Business Entity')).not.toBeInTheDocument()
})

it('test_loading_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseBusinessEntities.mockReturnValue({ data: undefined, isLoading: true })
  mockUseMarketplaces.mockReturnValue({ data: { results: mockMarketplaces, count: 2, next: null, previous: null } })
  mockUseCreateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseUpdateBusinessEntity.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })

  renderPage()

  expect(screen.getByText('Loading...')).toBeInTheDocument()
})
