/**
 * renderHook tests for useProductEdit.
 * Seam: the hook's public interface (state + action handlers).
 */
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import React from 'react'
import { useProductEdit } from '../../../hooks/inventory/useProductEdit'
import { toast } from '../../../lib/toast'

vi.mock('../../../hooks/api/inventory', () => ({
  useProduct: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCategories: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCreateProduct: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'new-id' }), isPending: false })),
  useUpdateProduct: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useSaveVariants: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useSaveAnyVariants: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUploadAnyVariantPhoto: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUploadDimensionImage: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ photo_url: 'http://x.com/img.jpg' }), isPending: false })),
  useDeleteDimensionImage: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useProductSuppliers: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCreateProductSupplier: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useDeleteProductSupplier: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useSuppliers: vi.fn(() => ({ data: undefined, isLoading: false })),
  useProductBusinessEntities: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAttachBusinessEntity: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDetachBusinessEntity: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useBusinessEntities: vi.fn(() => ({ data: undefined, isLoading: false })),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn(() => ({})), useNavigate: vi.fn(() => vi.fn()) }
})

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { useParams } from 'react-router-dom'
import {
  useProduct, useCategories, useCreateProduct, useUpdateProduct,
  useSaveVariants, useSaveAnyVariants, useProductSuppliers,
  useCreateProductSupplier, useDeleteProductSupplier, useSuppliers,
} from '../../../hooks/api/inventory'

function makeQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    QueryClientProvider,
    { client: makeQc() },
    React.createElement(MemoryRouter, null, children),
  )
}

function hookResult(data: unknown) {
  return { data, isLoading: false } as never
}

function mutationMock(overrides?: Record<string, unknown>) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides } as never
}

const baseProduct = {
  id: '123', company: 'c1', category: 'cat1', category_id: 'cat1', category_name: 'Category 1',
  name: 'Test Product', sku_code: 'TST', description: 'A test product description',
  total_qty: 0, total_cogs: 0, length: 0, width: 0, height: 0, weight: 0,
  is_active: true, master_category_key: null, photos: [], variants: [],
  variant_options: [], dim1_key: '', dim2_key: '', dim1_options: [], dim2_options: [],
  dimension_images: [], cdate: '', udate: '',
}

const mockCategories = {
  results: [{ id: 'cat1', name: 'Category 1', company: 'c1', category_code: 'C1', description: '', is_active: true, cdate: '', udate: '' }],
  count: 1, next: null, previous: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useProductSuppliers).mockReturnValue(hookResult(undefined))
  vi.mocked(useCreateProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useDeleteProductSupplier).mockReturnValue(mutationMock())
  vi.mocked(useSuppliers).mockReturnValue(hookResult(undefined))
})

describe('initial state', () => {
  it('isEditing is false when no :id param', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    expect(result.current.isEditing).toBe(false)
  })

  it('isEditing is true when :id param present', () => {
    vi.mocked(useParams).mockReturnValue({ id: '123' })
    vi.mocked(useProduct).mockReturnValue(hookResult(baseProduct))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    expect(result.current.isEditing).toBe(true)
  })

  it('isSaving starts false', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    expect(result.current.isSaving).toBe(false)
  })

  it('rows starts empty in create mode', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    expect(result.current.rows).toHaveLength(0)
  })
})

describe('dimension state', () => {
  it('handleAddVariasi slot 1 shows dim1 controls', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    expect(result.current.showDim1).toBe(false)
    act(() => { result.current.handleAddVariasi(1) })
    expect(result.current.showDim1).toBe(true)
  })

  it('handleAddVariasi slot 2 shows dim2 controls', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    act(() => { result.current.handleAddVariasi(2) })
    expect(result.current.showDim2).toBe(true)
  })

  it('handleRemoveDim1 sets removeDimConfirm to 1', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    act(() => { result.current.handleRemoveDim1() })
    expect(result.current.removeDimConfirm).toBe(1)
  })

  it('confirmRemoveDim(1) clears both dim states', () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    act(() => {
      result.current.handleAddVariasi(1)
      result.current.setDim1Key('Warna')
    })
    act(() => { result.current.handleRemoveDim1() })
    act(() => { result.current.confirmRemoveDim() })
    expect(result.current.showDim1).toBe(false)
    expect(result.current.dim1Key).toBe('')
    expect(result.current.removeDimConfirm).toBeNull()
  })
})

describe('handleDim1OptionsChange', () => {
  it('shows error toast when removing an option with stock', () => {
    const productWithStock = {
      ...baseProduct,
      dim1_key: 'Warna',
      dim1_options: ['Merah'],
      variants: [{
        id: 'var-1', name: 'Merah', sku_variant_code: 'TST-RED', base_price: 10000,
        variant_values: { Warna: 'Merah' }, is_active: true,
        total_incoming_qty: 5, total_available_qty: 5,
        product: '123', product_name: 'Test', company: 'c1',
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

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    // Wait for product to initialize rows
    act(() => {
      // Simulate removing the option with stock
      result.current.handleDim1OptionsChange([])
    })
    expect(toast.error).toHaveBeenCalledWith('Tidak dapat menghapus opsi: ada varian dengan stok')
  })
})

describe('handleBulkFillPrice', () => {
  it('sets base_price on all non-removed rows', () => {
    const productWithVariants = {
      ...baseProduct,
      dim1_key: 'Warna',
      dim1_options: ['Merah', 'Biru'],
      variants: [
        { id: 'v1', name: 'Merah', sku_variant_code: 'R', base_price: 0, variant_values: { Warna: 'Merah' }, is_active: true, total_incoming_qty: 0, total_available_qty: 0, product: '123', product_name: 'T', company: 'c1', sku: 'T', cdate: '', udate: '', product_supplier_link: null, product_photo_url: null, photo_url: null },
        { id: 'v2', name: 'Biru', sku_variant_code: 'B', base_price: 0, variant_values: { Warna: 'Biru' }, is_active: true, total_incoming_qty: 0, total_available_qty: 0, product: '123', product_name: 'T', company: 'c1', sku: 'T', cdate: '', udate: '', product_supplier_link: null, product_photo_url: null, photo_url: null },
      ],
    }
    vi.mocked(useParams).mockReturnValue({ id: '123' })
    vi.mocked(useProduct).mockReturnValue(hookResult(productWithVariants))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    act(() => { result.current.handleBulkFillPrice(50000) })
    expect(result.current.rows.every(r => r.base_price === 50000)).toBe(true)
  })
})

describe('create mode vs edit mode', () => {
  it('in create mode: calls createMutation then saveAnyVariants on submit', async () => {
    const createMutateAsync = vi.fn().mockResolvedValue({ id: 'new-id' })
    const saveAnyMutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock({ mutateAsync: createMutateAsync }))
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())
    vi.mocked(useSaveAnyVariants).mockReturnValue(mutationMock({ mutateAsync: saveAnyMutateAsync }))

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    await act(async () => {
      await result.current.onSubmit({
        name: 'New Product',
        category: 'cat1',
        description: 'This is at least 25 chars long description text',
      })
    })
    expect(createMutateAsync).toHaveBeenCalled()
    expect(saveAnyMutateAsync).toHaveBeenCalled()
  })

  it('in edit mode: calls updateMutation then saveMutation on submit', async () => {
    const updateMutateAsync = vi.fn().mockResolvedValue({ id: '123' })
    const saveMutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useParams).mockReturnValue({ id: '123' })
    vi.mocked(useProduct).mockReturnValue(hookResult(baseProduct))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock({ mutateAsync: updateMutateAsync }))
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock({ mutateAsync: saveMutateAsync }))

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    await act(async () => {
      await result.current.onSubmit({
        name: 'Updated Product',
        category: 'cat1',
        description: 'This is at least 25 chars long description text',
      })
    })
    expect(updateMutateAsync).toHaveBeenCalled()
    expect(saveMutateAsync).toHaveBeenCalled()
  })

  it('shows error toast when same dim key used for dim1 and dim2', async () => {
    vi.mocked(useParams).mockReturnValue({})
    vi.mocked(useProduct).mockReturnValue(hookResult(undefined))
    vi.mocked(useCategories).mockReturnValue(hookResult(mockCategories))
    vi.mocked(useCreateProduct).mockReturnValue(mutationMock())
    vi.mocked(useUpdateProduct).mockReturnValue(mutationMock())
    vi.mocked(useSaveVariants).mockReturnValue(mutationMock())

    const { result } = renderHook(() => useProductEdit(), { wrapper })
    act(() => {
      result.current.handleAddVariasi(1)
      result.current.handleAddVariasi(2)
      result.current.setDim1Key('Warna')
      result.current.setDim2Key('Warna')
    })
    // Use internal state: set showDim1/showDim2 flags
    act(() => {
      // Directly trigger validation by calling onSubmit
    })
    await act(async () => {
      await result.current.onSubmit({ name: 'P', category: 'cat1', description: 'At least 25 chars here for test ok' })
    })
    expect(toast.error).toHaveBeenCalledWith('Variasi 1 dan Variasi 2 tidak boleh memiliki nama yang sama')
  })
})
