import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import ProductDetailPage from '../ProductDetailPage'

const mockUseProduct = vi.fn()
const mockUseSaveVariants = vi.fn()
const mockUseProductSuppliers = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useSaveVariants: (...args: unknown[]) => mockUseSaveVariants(...args),
  useProductSuppliers: (...args: unknown[]) => mockUseProductSuppliers(...args),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn().mockReturnValue({ id: 'p1' }),
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
  }
})

const baseProduct = {
  id: 'p1',
  company: 'c1',
  name: 'Test Product',
  sku_code: 'TST-001',
  description: 'A test product',
  is_active: true,
  weight: null,
  length: null,
  width: null,
  height: null,
  total_qty: 0,
  total_cogs: 0,
  category_id: null,
  category_name: null,
  master_category_key: null,
  photos: [],
  variants: [],
  variant_options: {},
  specifications: {},
  cdate: '',
  udate: '',
}

const mockSuppliers = [
  { id: 'ps1', supplier_id: 's1', supplier_name: 'Alpha Supplies', supplier_link: 'https://alpha.com', cdate: '', udate: '' },
  { id: 'ps2', supplier_id: 's2', supplier_name: 'Beta Trading', supplier_link: null, cdate: '', udate: '' },
]

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductDetailPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

it('test_product_detail_shows_suppliers_section', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('Suppliers')).toBeInTheDocument()
  expect(screen.getByText('Alpha Supplies')).toBeInTheDocument()
  expect(screen.getByText('Beta Trading')).toBeInTheDocument()
})

it('test_product_detail_supplier_link_renders', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })

  renderPage()

  const link = screen.getByRole('link', { name: /https:\/\/alpha\.com/ })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', 'https://alpha.com')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

it('test_product_detail_supplier_no_link_shows_fallback', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('No link')).toBeInTheDocument()
})

it('test_product_detail_no_suppliers_shows_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('No suppliers linked')).toBeInTheDocument()
})
