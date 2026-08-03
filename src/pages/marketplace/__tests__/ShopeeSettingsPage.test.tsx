import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import ShopeeSettingsPage from '../shopee/ShopeeSettingsPage'

vi.mock('../../../hooks/api/useMarketplace', () => ({
  useShopeeShops: vi.fn(),
  useCreateShopeeShop: vi.fn(),
  useDeleteShopeeShop: vi.fn(),
  useTriggerShopeeSync: vi.fn(),
}))

import {
  useShopeeShops,
  useCreateShopeeShop,
  useDeleteShopeeShop,
  useTriggerShopeeSync,
} from '../../../hooks/api/useMarketplace'

const baseMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ShopeeSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('renders empty state', () => {
  vi.mocked(useShopeeShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useTriggerShopeeSync).mockReturnValue(baseMutation as never)

  renderPage()

  expect(screen.getByText('No shops connected')).toBeInTheDocument()
})

it('shows error state when list query fails', () => {
  vi.mocked(useShopeeShops).mockReturnValue({
    data: undefined,
    isLoading: false, isError: true,
    error: { status: 500, message: 'Failed to load shops' },
    refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useTriggerShopeeSync).mockReturnValue(baseMutation as never)

  renderPage()

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByText('Failed to load shops')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
})

it('shows required field validation errors on empty submit', async () => {
  vi.mocked(useShopeeShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useDeleteShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useTriggerShopeeSync).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add shop/i }))
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  expect(await screen.findByText('Shop name is required')).toBeInTheDocument()
})

it('disables submit while in flight', async () => {
  vi.mocked(useShopeeShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  vi.mocked(useCreateShopeeShop).mockReturnValue({
    mutate: vi.fn(), mutateAsync: vi.fn(() => new Promise(() => { /* never resolves */ })), isPending: true,
  } as never)
  vi.mocked(useDeleteShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useTriggerShopeeSync).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add shop/i }))

  const submitBtn = screen.getByRole('button', { name: /creating/i })
  expect(submitBtn).toBeDisabled()
})

it('surfaces server field error via applyApiErrors', async () => {
  vi.mocked(useShopeeShops).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
    isLoading: false, isError: false, error: null, refetch: vi.fn(),
  } as never)
  const apiError = { status: 400, message: 'Validation failed.', fieldErrors: { shop_name: 'Shop name already exists' } }
  vi.mocked(useCreateShopeeShop).mockReturnValue({
    mutate: vi.fn(), mutateAsync: vi.fn().mockRejectedValue(apiError), isPending: false,
  } as never)
  vi.mocked(useDeleteShopeeShop).mockReturnValue(baseMutation as never)
  vi.mocked(useTriggerShopeeSync).mockReturnValue(baseMutation as never)

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add shop/i }))

  const dialog = screen.getByRole('dialog', { name: /add shopee shop/i })
  // Fill all required fields to pass Zod validation and reach mutateAsync
  // textboxes: shop_name, access_token, refresh_token; spinbuttons: shop_id, partner_id; partner_key is type=password
  const textboxes = within(dialog).getAllByRole('textbox')
  const spinbuttons = within(dialog).getAllByRole('spinbutton')
  const passwordInputs = dialog.querySelectorAll('input[type="password"]')
  await userEvent.type(textboxes[0], 'My Shop')         // shop_name
  await userEvent.type(spinbuttons[0], '123')             // shop_id
  await userEvent.type(spinbuttons[1], '456')             // partner_id
  await userEvent.type(passwordInputs[0] as HTMLElement, 'key123')  // partner_key
  await userEvent.type(textboxes[1], 'token123')         // access_token
  await userEvent.type(textboxes[2], 'refresh123')       // refresh_token
  await userEvent.click(screen.getByRole('button', { name: /^create$/i }))

  expect(await screen.findByText('Shop name already exists')).toBeInTheDocument()
})
