import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect } from 'vitest'
import { ProductFormModal } from '../ProductFormModal'

vi.mock('../../../hooks/useInventory', () => ({
  useCategories: () => ({ data: { results: [] } }),
  useCreateCategory: () => ({ mutateAsync: vi.fn() }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateProduct: () => ({ mutateAsync: vi.fn() }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { company_id: 'c1' } }),
}))

function renderModal(open = true, product?: Record<string, unknown>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ProductFormModal open={open} onClose={vi.fn()} product={product as never} />
    </QueryClientProvider>,
  )
}

it('does NOT render supplier link field', () => {
  renderModal()
  expect(screen.queryByPlaceholderText('https://...')).not.toBeInTheDocument()
})

it('does NOT populate supplier link when editing', () => {
  const product = {
    id: 'p1',
    name: 'Test Product',
    company: 'c1',
    category: 'cat1',
    category_name: 'Category 1',
    sku_code: 'TP-001',
    description: 'Test product description with enough characters for validation',
    total_qty: 100,
    total_cogs: 5000000,
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    is_active: true,
    cdate: '',
    udate: '',
  }
  renderModal(true, product)
  expect(screen.queryByDisplayValue('https://supplier.example.com/product/123')).not.toBeInTheDocument()
})
