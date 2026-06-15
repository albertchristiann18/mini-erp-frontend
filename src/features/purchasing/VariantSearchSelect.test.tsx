import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import { VariantSearchSelect } from './VariantSearchSelect'

const mockUseVariantSearch = vi.fn()

vi.mock('../../hooks/useInventory', () => ({
  useVariantSearch: (...args: unknown[]) => mockUseVariantSearch(...args),
}))

vi.mock('./QuickCreateProductModal', () => ({
  QuickCreateProductModal: () => null,
}))

const mockVariant = {
  id: 'v1',
  name: 'Red Variant',
  sku_variant_code: 'RED-001',
  product: 'prod-1',
  product_name: 'Product A',
  product_supplier_link: null,
  product_photo_url: null,
  base_price: 100,
  total_available_qty: 50,
  physical_qty: 50,
  is_active: true,
  last_unit_price_foreign: '15.50',
  last_currency: 'CNY',
}

function renderSelect(onSelect = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <VariantSearchSelect value="" onSelect={onSelect} />
    </QueryClientProvider>,
  )
}

it('test_on_select_passes_last_price', async () => {
  mockUseVariantSearch.mockReturnValue({ data: { results: [mockVariant], count: 1, next: null, previous: null }, isLoading: false })
  const onSelect = vi.fn()

  renderSelect(onSelect)

  const trigger = screen.getByRole('button', { name: /select variant/i })
  await userEvent.click(trigger)

  const variantButton = await screen.findByRole('button', { name: /Product A/ })
  await userEvent.click(variantButton)

  expect(onSelect).toHaveBeenCalledWith(
    'v1',
    'Red Variant (RED-001)',
    'prod-1',
    'Product A',
    null,
    null,
    '15.50',
    'CNY',
  )
})
