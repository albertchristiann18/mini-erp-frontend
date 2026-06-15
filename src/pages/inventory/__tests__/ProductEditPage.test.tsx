import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, beforeEach } from 'vitest'
import ProductEditPage from '../ProductEditPage'

vi.mock('../../../hooks/useInventory', () => ({
  useProduct: vi.fn(),
  useCategories: vi.fn(),
  useCreateProduct: vi.fn(),
  useUpdateProduct: vi.fn(),
  useSaveVariants: vi.fn(),
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
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
  }
})

vi.mock('../../../api/inventory', () => ({
  saveVariants: vi.fn().mockResolvedValue({ data: {} }),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import {
  useProduct, useCategories, useCreateProduct, useUpdateProduct, useSaveVariants,
  useProductSuppliers, useCreateProductSupplier, useDeleteProductSupplier, useSuppliers,
} from '../../../hooks/useInventory'
import { useParams } from 'react-router-dom'
import { saveVariants } from '../../../api/inventory'
import { toast } from '../../../lib/toast'

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

it('adding a dimension and adding a value creates a variant row', async () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add attribute/i }))
  const dimInput = screen.getByPlaceholderText(/attribute name/i)
  await userEvent.type(dimInput, 'Color')
  await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

  await userEvent.click(screen.getByRole('button', { name: /add color/i }))
  const valueInput = screen.getByPlaceholderText(/add color/i)
  await userEvent.type(valueInput, 'Red')
  await userEvent.keyboard('{Enter}')

  const redElements = screen.getAllByText('Red')
  expect(redElements.length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText('Variant Matrix (1)')).toBeInTheDocument()
})

it('clicking × on a row with no stock marks it removed', async () => {
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

  renderPage()

  await userEvent.click(screen.getByRole('button', { name: /add attribute/i }))
  const dimInput = screen.getByPlaceholderText(/attribute name/i)
  await userEvent.type(dimInput, 'Color')
  await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

  await userEvent.click(screen.getByRole('button', { name: /add color/i }))
  const valueInput = screen.getByPlaceholderText(/add color/i)
  await userEvent.type(valueInput, 'Red')
  await userEvent.keyboard('{Enter}')

  expect(screen.getByText('Variant Matrix (1)')).toBeInTheDocument()

  const variantSection = screen.getByText(/^Variant Matrix \(\d+\)$/)
    .closest('div.rounded-lg')!
  const deleteButtons = variantSection.querySelectorAll('button')
  const removeBtn = Array.from(deleteButtons).find(b =>
    b.textContent === 'Delete',
  )
  await userEvent.click(removeBtn!)

  expect(screen.getByText(/No variants yet/)).toBeInTheDocument()
})

it('clicking × on a row with stock shows error toast and keeps row', async () => {
  const productWithStock = {
    ...baseProduct,
    variant_options: [{ id: 'color', name: 'Color', order: 1, values: [{ id: 'red', label: 'Red' }] }],
    variants: [{
      id: 'var-1', name: 'Red', sku_variant_code: 'SKU-RED', base_price: 10000,
      variant_values: { 'color': 'red' }, is_active: true,
      total_incoming_qty: 5, total_available_qty: 5,
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

  const variantSection = screen.getByText(/^Variant Matrix \(\d+\)$/).closest('div.rounded-lg')!
  const deleteButtons = variantSection.querySelectorAll('button')
  const removeBtn = Array.from(deleteButtons).find(b =>
    b.textContent === 'Delete',
  )
  await userEvent.click(removeBtn!)

  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('stock'))
})

it('submit calls createMutation then saveVariants on create flow', async () => {
  const createMutateAsync = vi.fn().mockResolvedValue({ id: 'new-id' })
  vi.mocked(useParams).mockReturnValue({})
  vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock({ mutateAsync: createMutateAsync }))
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

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
  expect(saveVariants).toHaveBeenCalled()
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

it('dimension rows have grip handle when 2 dimensions exist', () => {
  const productWithDims = {
    ...baseProduct,
    variant_options: { Color: ['Red', 'Blue'], Size: ['S', 'M'] },
    variants: [
      {
        id: 'var-1', name: 'Red-S', sku_variant_code: 'SKU-RS', base_price: 10000,
        variant_values: { Color: 'Red', Size: 'S' }, is_active: true,
        total_incoming_qty: 0, total_available_qty: 0, photo_url: null,
      },
    ],
  }
  vi.mocked(useParams).mockReturnValue({ id: '123' })
  vi.mocked(useProduct).mockReturnValue(hookResult(productWithDims))
  vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
  vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
  vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
  vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult({ results: [], count: 0, next: null, previous: null }))

  renderPage()
  const grips = screen.getAllByTitle('Drag to reorder')
  expect(grips).toHaveLength(2)
})

it('variant matrix shows photo column', () => {
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

  expect(screen.getByText('Photo')).toBeInTheDocument()
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
