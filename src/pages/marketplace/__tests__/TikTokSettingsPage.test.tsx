import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import TikTokSettingsPage from '../tiktok/TikTokSettingsPage'

vi.mock('../../../hooks/api/useMarketplace', () => ({
  useTikTokShops: vi.fn(),
  useCreateTikTokShop: vi.fn(),
  useUpdateTikTokShop: vi.fn(),
  useDeleteTikTokShop: vi.fn(),
  useRefreshTikTokToken: vi.fn(),
}))

import {
  useTikTokShops,
  useCreateTikTokShop,
  useUpdateTikTokShop,
  useDeleteTikTokShop,
  useRefreshTikTokToken,
} from '../../../hooks/api/useMarketplace'

const baseMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TikTokSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function setupHooks() {
  vi.mocked(useCreateTikTokShop).mockReturnValue(baseMutation as never)
  vi.mocked(useUpdateTikTokShop).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteTikTokShop).mockReturnValue(baseMutation as never)
  vi.mocked(useRefreshTikTokToken).mockReturnValue(baseMutation as never)
}

it('renders empty state', () => {
  vi.mocked(useTikTokShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  setupHooks()

  renderPage()

  expect(screen.getByText('No shops connected')).toBeInTheDocument()
})

it('shows error state when list query fails', () => {
  vi.mocked(useTikTokShops).mockReturnValue({
    data: undefined,
    isLoading: false, isError: true,
    error: { status: 500, message: 'Failed to load TikTok shops' },
    refetch: vi.fn(),
  } as never)
  setupHooks()

  renderPage()

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText('Failed to load TikTok shops')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})

it('shows required field validation errors on empty submit', async () => {
  vi.mocked(useTikTokShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  setupHooks()

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add shop/i }))
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  expect(await screen.findByText('Company is required')).toBeInTheDocument()
})

it('app_secret not required on edit and shows placeholder', async () => {
  const shop = {
    id: 's1', company: 'My Company', shop_id: 'shop123', shop_name: 'TikTok Shop',
    app_key: 'key123', access_token: 'tok', refresh_token: 'ref',
    token_expires_at: null, is_active: true, warehouse: null, cdate: '', udate: '',
  }
  vi.mocked(useTikTokShops).mockReturnValue({
    data: { results: [shop], count: 1, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  setupHooks()

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

  const appSecretInput = screen.getByPlaceholderText(/leave blank to keep current/i)
  expect(appSecretInput).toBeInTheDocument()
  expect(appSecretInput).not.toBeRequired()
})

it('clicking Edit prefills form with existing shop values', async () => {
  const shop = {
    id: 's1', company: 'My Company', shop_id: 'shop123', shop_name: 'TikTok Shop',
    app_key: 'key123', access_token: 'tok', refresh_token: 'ref',
    token_expires_at: null, is_active: true, warehouse: null, cdate: '', udate: '',
  }
  vi.mocked(useTikTokShops).mockReturnValue({
    data: { results: [shop], count: 1, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  setupHooks()

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

  expect(screen.getByDisplayValue('My Company')).toBeInTheDocument()
  expect(screen.getByDisplayValue('shop123')).toBeInTheDocument()
  expect(screen.getByDisplayValue('TikTok Shop')).toBeInTheDocument()
  expect(screen.getByDisplayValue('key123')).toBeInTheDocument()
})

it('disables submit while in flight', async () => {
  vi.mocked(useTikTokShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateTikTokShop).mockReturnValue({
    mutate: vi.fn(), mutateAsync: vi.fn(() => new Promise(() => { /* never resolves */ })), isPending: true,
  } as never)
  vi.mocked(useUpdateTikTokShop).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteTikTokShop).mockReturnValue(baseMutation as never)
  vi.mocked(useRefreshTikTokToken).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add shop/i }))

  const submitBtn = screen.getByRole('button', { name: /creating/i })
  expect(submitBtn).toBeDisabled()
})
