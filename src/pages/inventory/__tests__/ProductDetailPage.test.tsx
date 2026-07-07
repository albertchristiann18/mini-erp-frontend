import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect } from 'vitest'
import ProductDetailPage from '../ProductDetailPage'
import { toast } from '../../../lib/toast'

const mockUseProduct = vi.fn()
const mockUseSaveVariants = vi.fn()
const mockUseProductSuppliers = vi.fn()
const mockUseProductBusinessEntities = vi.fn()
const mockUseAttachBusinessEntity = vi.fn()
const mockUseDetachBusinessEntity = vi.fn()
const mockUseBusinessEntities = vi.fn()
const mockUseAuth = vi.fn()
const mockUseUpdateProductSupplier = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock('../../../hooks/useInventory', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
  useSaveVariants: (...args: unknown[]) => mockUseSaveVariants(...args),
  useProductSuppliers: (...args: unknown[]) => mockUseProductSuppliers(...args),
  useProductBusinessEntities: (...args: unknown[]) => mockUseProductBusinessEntities(...args),
  useAttachBusinessEntity: (...args: unknown[]) => mockUseAttachBusinessEntity(...args),
  useDetachBusinessEntity: (...args: unknown[]) => mockUseDetachBusinessEntity(...args),
  useBusinessEntities: (...args: unknown[]) => mockUseBusinessEntities(...args),
  useUpdateProductSupplier: (...args: unknown[]) => mockUseUpdateProductSupplier(...args),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}))

vi.mock('../../../lib/toast')

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

beforeEach(() => {
  mockMutateAsync.mockResolvedValue({})
  mockUseUpdateProductSupplier.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  } as any)
})

it('test_product_detail_shows_suppliers_section', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

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
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

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
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('No link')).toBeInTheDocument()
})

it('test_product_detail_no_suppliers_shows_empty_state', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('No suppliers linked')).toBeInTheDocument()
})

it('test_shows_business_entities_section', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({
    data: {
      results: [
        { id: 'pbe1', product_id: 'p1', product_name: 'Test Product', product_sku: 'TST-001', business_entity_id: 'be1', business_entity_name: 'Toko A', marketplace_id: 'm1', marketplace_name: 'Shopee', cdate: '' },
      ],
      count: 1, next: null, previous: null,
    },
  })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('Business Entities')).toBeInTheDocument()
  expect(screen.getByText('Toko A')).toBeInTheDocument()
  expect(screen.getByText('Shopee')).toBeInTheDocument()
})

it('test_shows_empty_business_entities', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('No business entities attached')).toBeInTheDocument()
})

it('hides edit pencil for non-staff users', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: false } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.queryByTestId('edit-supplier-link-ps1')).not.toBeInTheDocument()
})

it('sends null when saving empty supplier link', async () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  fireEvent.click(screen.getByTestId('edit-supplier-link-ps1'))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await vi.waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'ps1', supplier_link: null })
  })
})

it('shows error toast when save fails and dialog stays open', async () => {
  mockMutateAsync.mockRejectedValue(new Error('network error'))
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({ data: baseProduct, isLoading: false })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: mockSuppliers, count: 2, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  fireEvent.click(screen.getByTestId('edit-supplier-link-ps1'))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await vi.waitFor(() => {
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to update supplier link')
  })
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it('renders without crashing when variant_options has non-array values', () => {
  mockUseAuth.mockReturnValue({ user: { is_staff: true } })
  mockUseProduct.mockReturnValue({
    data: {
      ...baseProduct,
      variant_options: { size: ['S', 'M', 'L'], color: 'red' },
    },
    isLoading: false,
  })
  mockUseSaveVariants.mockReturnValue({ mutateAsync: vi.fn(), isPending: false })
  mockUseProductSuppliers.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseProductBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })
  mockUseAttachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseDetachBusinessEntity.mockReturnValue({ mutate: vi.fn() })
  mockUseBusinessEntities.mockReturnValue({ data: { results: [], count: 0, next: null, previous: null } })

  renderPage()

  expect(screen.getByText('Test Product')).toBeInTheDocument()
})
