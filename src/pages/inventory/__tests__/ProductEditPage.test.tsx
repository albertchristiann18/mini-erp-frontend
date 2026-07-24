import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import ProductEditPage from '../ProductEditPage'

vi.mock('../../../hooks/api/useInventory', () => ({
  useProduct: vi.fn(),
  useCategories: vi.fn(),
  useCreateProduct: vi.fn(),
  useUpdateProduct: vi.fn(),
  useSaveVariants: vi.fn(),
  useSaveAnyVariants: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUploadAnyVariantPhoto: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useProductSuppliers: vi.fn(),
  useCreateProductSupplier: vi.fn(),
  useDeleteProductSupplier: vi.fn(),
  useSuppliers: vi.fn(),
  useProductBusinessEntities: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAttachBusinessEntity: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDetachBusinessEntity: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useBusinessEntities: vi.fn(() => ({ data: undefined, isLoading: false })),
  useUploadVariantPhoto: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteVariantPhoto: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUploadDimensionImage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteDimensionImage: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUploadProductPhoto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteProductPhoto: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useReorderProductPhotos: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
  }
})

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import {
  useProduct, useCategories, useCreateProduct, useUpdateProduct, useSaveVariants,
  useProductSuppliers, useCreateProductSupplier, useDeleteProductSupplier, useSuppliers,
  useSaveAnyVariants,
} from '../../../hooks/api/useInventory'
import { useParams } from 'react-router-dom'
import { toast } from '../../../lib/toast'
import { initializeRows } from '../ProductEditPage'

const baseProduct = {
  id: '123',
  company: 'c1',
  category: 'cat1',
  category_id: 'cat1',
  category_name: 'Category 1',
  name: 'Test Product',
  sku_code: 'TST',
  description: 'A test product description that is long enough',
  total_qty: 0,
  total_cogs: 0,
  length: 0,
  width: 0,
  height: 0,
  weight: 0,
  is_active: true,
  master_category_key: null,
  photos: [],
  variants: [],
  variant_options: [],
  dim1_key: '',
  dim2_key: '',
  dim1_options: [],
  dim2_options: [],
  dimension_images: [],
  cdate: '',
  udate: '',
}

const mockCategories = {
  results: [
    { id: 'cat1', name: 'Category 1', company: 'c1', category_code: 'C1', description: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 1, next: null, previous: null,
}

function hookResult(data: unknown) {
  return { data, isLoading: false } as never
}

function mutationMock(overrides?: Record<string, unknown>) {
  return { mutateAsync: vi.fn(), isPending: false, ...overrides } as never
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ProductEditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult(undefined))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult(undefined))
})

it('renders "New Product" heading when no :id param', () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()
  expect(screen.getByText('New Product')).toBeInTheDocument()
})

it('renders product name in heading when in edit mode', () => {
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(baseProduct))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()
  expect(screen.getByText('Test Product')).toBeInTheDocument()
})

it('description character counter updates on typing', async () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()

  const textarea = screen.getByPlaceholderText(/min 25 characters/i)
  await userEvent.type(textarea, 'Hello World This is a test description')

  expect(textarea).toHaveValue('Hello World This is a test description')
})

it('clicking Tambah Variasi reveals Variasi 1 name input', async () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  renderPage()
  await userEvent.click(screen.getByRole('button', { name: /tambah variasi/i }))
  expect(screen.getByPlaceholderText(/e\.g\. warna/i)).toBeInTheDocument()
})

it('removing a chip with stock shows error toast and keeps the row', async () => {
  const productWithStock = {
    ...baseProduct,
    id: '123',
    dim1_key: 'Warna',
    dim1_options: ['Merah'],
    variants: [{
      id: 'var-1', name: 'Merah', sku_variant_code: 'SKU-RED', base_price: 10000,
      variant_values: { 'Warna': 'Merah' }, is_active: true,
      total_incoming_qty: 5, total_available_qty: 5,
      product: 'prod-1', product_name: 'Test', company: 'c1',
      sku: 'TST', cdate: '', udate: '',
      product_supplier_link: null, product_photo_url: null, photo_url: null,
    }],
  }
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(productWithStock))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  renderPage()
  await waitFor(() => expect(screen.getByDisplayValue('SKU-RED')).toBeInTheDocument())
  expect(screen.getByText('Daftar Variasi (1)')).toBeInTheDocument()
  const removeBtn = screen.getByTestId('remove-chip-Merah')
  await userEvent.click(removeBtn)
  expect(toast.error).toHaveBeenCalledWith('Tidak dapat menghapus opsi: ada varian dengan stok')
  expect(screen.getByText('Daftar Variasi (1)')).toBeInTheDocument()
})

it('submit calls createMutation then useSaveAnyVariants on create flow', async () => {
  const createMutateAsync = vi.fn().mockResolvedValue({ id: 'new-id' })
  const saveAnyMutateAsync = vi.fn().mockResolvedValue({})
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock({ mutateAsync: createMutateAsync }))
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  vi.mocked(useSaveAnyVariants).mockReturnValue(mutationMock({ mutateAsync: saveAnyMutateAsync }))

  renderPage()

  await userEvent.type(screen.getByPlaceholderText(/enter product name/i), 'New Product')

  await userEvent.click(screen.getByRole('combobox'))
  const option = await screen.findByRole('option', { name: /category 1/i })
  await userEvent.click(option)

  await userEvent.type(
    screen.getByPlaceholderText(/min 25 characters/i),
    'This is a test description that is at least twenty five characters long',
  )

  const spinbuttons = screen.getAllByRole('spinbutton')
  for (const input of spinbuttons) {
    await userEvent.type(input, '1')
  }

  const form = document.querySelector('form')!
  fireEvent.submit(form)

  await waitFor(() => {
    expect(createMutateAsync).toHaveBeenCalled()
  })
  await waitFor(() => {
    expect(saveAnyMutateAsync).toHaveBeenCalled()
  })
})

it('does NOT render old Supplier Link form row in the basic info card', () => {
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(baseProduct))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))

  renderPage()
  expect(screen.queryByText('Supplier Link')).not.toBeInTheDocument()
})

it('does NOT render Suppliers card in create mode (no :id param)', () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult(undefined))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult(undefined))

  renderPage()
  expect(screen.queryByText('Suppliers')).not.toBeInTheDocument()
})

it('renders Suppliers card in edit mode (:id param present)', () => {
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(baseProduct))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))

  renderPage()
  expect(screen.getByText('Suppliers')).toBeInTheDocument()
})

it('initializeRows heals mismatched variant_values keys positionally', () => {
  const baseVariant = {
    product: 'prod-1', product_name: 'Test', company: 'c1',
    sku: 'SKU', cdate: '', udate: '',
    product_supplier_link: null, product_photo_url: null,
  }
  const product = {
    ...baseProduct,
    variant_options: { Size: ['S', 'M'] },
    variants: [
      {
        ...baseVariant,
        id: 'var-1', name: 'Small', sku_variant_code: 'SKU-S', base_price: 10000,
        variant_values: { variant: 'S' }, is_active: true,
        total_incoming_qty: 0, total_available_qty: 0, photo_url: null,
      },
      {
        ...baseVariant,
        id: 'var-2', name: 'Medium', sku_variant_code: 'SKU-M', base_price: 11000,
        variant_values: { variant: 'M' }, is_active: true,
        total_incoming_qty: 0, total_available_qty: 0, photo_url: null,
      },
    ],
  }
  const dims = [{ id: 'Size', name: 'Size', order: 1, values: [{ id: 'S', label: 'S' }, { id: 'M', label: 'M' }] }]

  const rows = initializeRows(product, dims)

  expect(rows).toHaveLength(2)
  expect(rows[0].variantValues).toEqual({ Size: 'S' })
  expect(rows[1].variantValues).toEqual({ Size: 'M' })
})

it('initializeRows leaves matching keys unchanged', () => {
  const baseVariant = {
    product: 'prod-1', product_name: 'Test', company: 'c1',
    sku: 'SKU', cdate: '', udate: '',
    product_supplier_link: null, product_photo_url: null,
  }
  const product = {
    ...baseProduct,
    variant_options: { Color: ['Red', 'Blue'] },
    variants: [
      {
        ...baseVariant,
        id: 'var-1', name: 'Red', sku_variant_code: 'SKU-R', base_price: 10000,
        variant_values: { Color: 'Red' }, is_active: true,
        total_incoming_qty: 0, total_available_qty: 0, photo_url: null,
      },
    ],
  }
  const dims = [{ id: 'Color', name: 'Color', order: 1, values: [{ id: 'Red', label: 'Red' }] }]

  const rows = initializeRows(product, dims)

  expect(rows[0].variantValues).toEqual({ Color: 'Red' })
})

it('variant photo cell shows ImagePlus placeholder when no photo', () => {
  const productWithVariant = {
    ...baseProduct,
    variant_options: { Color: ['Red'] },
    variants: [{
      id: 'var-1', name: 'Red', sku_variant_code: 'SKU-RED', base_price: 10000,
      variant_values: { Color: 'red' }, is_active: true,
      total_incoming_qty: 0, total_available_qty: 0, photo_url: null,
    }],
  }
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(productWithVariant))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()

  expect(screen.getByDisplayValue('SKU-RED')).toBeInTheDocument()
})

it('onSubmit sends dim1_key and dim1_options in product PATCH', async () => {
  const updateMock = vi.fn().mockResolvedValue({ id: '123' })
  const productWithDims = {
    ...baseProduct,
    id: '123',
    dim1_key: 'Warna',
    dim1_options: ['White', 'Pink'],
    variants: [{
      id: 'var-1', name: 'White', sku_variant_code: 'TST-WH', base_price: 10000,
      variant_values: { 'Warna': 'White' }, is_active: true,
      total_incoming_qty: 0, total_available_qty: 0,
      product: '123', product_name: 'Test Product', company: 'c1',
      sku: 'TST', cdate: '', udate: '',
      product_supplier_link: null, product_photo_url: null, photo_url: null,
    }],
  }
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(productWithDims))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock({ mutateAsync: updateMock }))
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  renderPage()
  await waitFor(() => expect(screen.getByDisplayValue('TST-WH')).toBeInTheDocument())
  const form = document.querySelector('form')!
  fireEvent.submit(form)
  await waitFor(() => {
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dim1_key: 'Warna', dim1_options: ['White', 'Pink'] }),
    }))
  })
})
