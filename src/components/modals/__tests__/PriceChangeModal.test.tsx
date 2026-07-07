import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import { PriceChangeModal } from '../PriceChangeModal'

const mockMutateAsync = vi.hoisted(() => vi.fn())
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('../../../hooks/useInventory', () => ({
  useUpdateVariantPrice: () => ({ mutateAsync: mockMutateAsync }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: mockToast,
}))

const mockProduct = {
  id: 'p1',
  name: 'Test Product',
  company: 'c1',
  category: 'cat1',
  category_id: 'cat1',
  category_name: 'Category 1',
  sku_code: 'TP-001',
  description: 'Test description',
  total_qty: 100,
  total_cogs: 5000000,
  length: 0,
  width: 0,
  height: 0,
  weight: 0,
  is_active: true,
  supplier_link: null,
  master_category_key: null,
  cdate: '',
  udate: '',
  variants: [
    { id: 'v1', product: 'p1', product_name: 'Test Product', company: 'c1', name: 'Black / M', sku: 'TP-001-BLK-M', sku_variant_code: 'TP-001-BLK-M', product_supplier_link: null, product_photo_url: null, photo_url: null, base_price: 100000, total_available_qty: 10, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
    { id: 'v2', product: 'p1', product_name: 'Test Product', company: 'c1', name: 'White / L', sku: 'TP-001-WHT-L', sku_variant_code: 'TP-001-WHT-L', product_supplier_link: null, product_photo_url: null, photo_url: null, base_price: 95000, total_available_qty: 5, total_incoming_qty: 0, is_active: true, cdate: '', udate: '' },
  ],
}

function renderModal(open = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PriceChangeModal open={open} onClose={vi.fn()} product={mockProduct} />
    </QueryClientProvider>,
  )
}

it('renders variant names and current prices', () => {
  renderModal()
  expect(screen.getByText('Black / M')).toBeInTheDocument()
  expect(screen.getByText('White / L')).toBeInTheDocument()
  expect(screen.getByDisplayValue('100000')).toBeInTheDocument()
  expect(screen.getByDisplayValue('95000')).toBeInTheDocument()
})

it('calls updateVariantPrice mutation on save when price changed', async () => {
  mockMutateAsync.mockResolvedValue({})
  renderModal()
  const input = screen.getByDisplayValue('100000')
  fireEvent.change(input, { target: { value: '110000' } })
  fireEvent.click(screen.getByText('Save Prices'))
  await vi.waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith({ productId: 'p1', variantId: 'v1', basePrice: 110000 })
  })
})

it('does not call mutation for unchanged prices', async () => {
  mockMutateAsync.mockReset()
  renderModal()
  fireEvent.click(screen.getByText('Save Prices'))
  await vi.waitFor(() => {
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})

it('shows error toast for invalid (non-numeric) price', async () => {
  mockMutateAsync.mockReset()
  renderModal()
  const input = screen.getByDisplayValue('100000')
  fireEvent.change(input, { target: { value: 'abc' } })
  fireEvent.click(screen.getByText('Save Prices'))
  await vi.waitFor(() => {
    expect(mockToast.error).toHaveBeenCalledWith('Invalid price for Black / M')
  })
})
