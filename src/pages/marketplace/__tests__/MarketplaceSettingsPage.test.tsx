import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import MarketplaceSettingsPage from '../MarketplaceSettingsPage'

vi.mock('../../../hooks/api/useMarketplace', () => ({
  useMarketplaceConnections: vi.fn(),
  useCreateMarketplaceConnection: vi.fn(),
  useToggleMarketplaceConnection: vi.fn(),
  useDeleteMarketplaceConnection: vi.fn(),
}))

import {
  useMarketplaceConnections,
  useCreateMarketplaceConnection,
  useToggleMarketplaceConnection,
  useDeleteMarketplaceConnection,
} from '../../../hooks/api/useMarketplace'

const mockConnections = [
  { id: 'c1', company: 'co1', platform: 'SHOPEE' as const, display_name: 'My Shopee', is_active: true, shopee_shop: null, tiktok_shop: null, cdate: '', udate: '' },
]

const baseMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MarketplaceSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders connection list', () => {
  vi.mocked(useMarketplaceConnections).mockReturnValue({
    data: { results: mockConnections, count: 1, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useToggleMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteMarketplaceConnection).mockReturnValue(baseMutation as never)

  renderPage()

  expect(screen.getByText('My Shopee')).toBeInTheDocument()
})

it('shows error state when list query fails', () => {
  vi.mocked(useMarketplaceConnections).mockReturnValue({
    data: undefined,
    isLoading: false, isError: true,
    error: { status: 500, message: 'Failed to load connections' },
    refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useToggleMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteMarketplaceConnection).mockReturnValue(baseMutation as never)

  renderPage()

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText('Failed to load connections')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})

it('shows empty state when no connections', () => {
  vi.mocked(useMarketplaceConnections).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useToggleMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteMarketplaceConnection).mockReturnValue(baseMutation as never)

  renderPage()

  expect(screen.getByText(/no marketplaces connected yet/i)).toBeInTheDocument()
})

it('shows display_name required validation error on empty submit', async () => {
  vi.mocked(useMarketplaceConnections).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useToggleMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteMarketplaceConnection).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /connect marketplace/i }))
  await userEvent.click(screen.getByRole('button', { name: /^connect$/i }))

  expect(await screen.findByText('Display name is required')).toBeInTheDocument()
})

it('disables submit button while in flight', async () => {
  vi.mocked(useMarketplaceConnections).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateMarketplaceConnection).mockReturnValue({
    mutate: vi.fn(), mutateAsync: vi.fn(() => new Promise(() => { /* never resolves */ })), isPending: true,
  } as never)
  vi.mocked(useToggleMarketplaceConnection).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteMarketplaceConnection).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /connect marketplace/i }))

  const submitBtn = screen.getByRole('button', { name: /connecting/i })
  expect(submitBtn).toBeDisabled()
})
