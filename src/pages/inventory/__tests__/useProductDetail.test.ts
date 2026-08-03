/**
 * renderHook tests for useProductDetail.
 * Seam: the hook's public interface (state + action handlers).
 *
 * Covers:
 *   - price-edit: handleStartEditPrices, handleCancelPrices, handleSavePrices (success + failure)
 *   - supplier-link: handleSaveSupplierLink (empty→null, success, failure)
 *   - attach/detach business entity
 *   - derived values: dims, activeVariants, marketplaceIds
 */
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import React from 'react'
import { useProductDetail } from '../../../hooks/inventory/useProductDetail'
import { toast } from '../../../lib/toast'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../../../hooks/api/inventory', () => ({
  useProduct: vi.fn(),
  useSaveVariants: vi.fn(),
  useProductSuppliers: vi.fn(),
  useProductBusinessEntities: vi.fn(),
  useAttachBusinessEntity: vi.fn(),
  useDetachBusinessEntity: vi.fn(),
  useBusinessEntities: vi.fn(),
  useUpdateProductSupplier: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { is_staff: true } })),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn(() => ({ id: 'p1' })), useNavigate: vi.fn(() => vi.fn()) }
})

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return { ...actual, useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })) }
})

import {
  useProduct,
  useSaveVariants,
  useProductSuppliers,
  useProductBusinessEntities,
  useAttachBusinessEntity,
  useDetachBusinessEntity,
  useBusinessEntities,
  useUpdateProductSupplier,
} from '../../../hooks/api/inventory'
import { useQueryClient } from '@tanstack/react-query'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const activeVariant = {
  id: 'v1',
  is_active: true,
  base_price: 50000,
  current_cogs: 40000,
  sku_variant_code: 'TST-001-S',
  variant_values: { size: 'S' },
  total_available_qty: 10,
  marketplace_listings: [{ marketplace_id: 'shopee-1' }],
}

function setupDefaults() {
  vi.mocked(useProduct).mockReturnValue({
    data: baseProduct,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  } as never)
  vi.mocked(useSaveVariants).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never)
  vi.mocked(useProductSuppliers).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
  } as never)
  vi.mocked(useProductBusinessEntities).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
  } as never)
  vi.mocked(useAttachBusinessEntity).mockReturnValue({ mutate: vi.fn() } as never)
  vi.mocked(useDetachBusinessEntity).mockReturnValue({ mutate: vi.fn() } as never)
  vi.mocked(useBusinessEntities).mockReturnValue({
    data: { results: [], count: 0, next: null, previous: null },
  } as never)
  vi.mocked(useUpdateProductSupplier).mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  } as never)
  vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: vi.fn() } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  setupDefaults()
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('derived values', () => {
  it('builds dims from variant_options', () => {
    vi.mocked(useProduct).mockReturnValue({
      data: { ...baseProduct, variant_options: { size: ['S', 'M'], color: ['Red'] } },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.dims).toHaveLength(2)
    expect(result.current.dims[0].name).toBe('size')
    expect(result.current.dims[1].name).toBe('color')
  })

  it('returns empty dims when variant_options is empty', () => {
    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.dims).toHaveLength(0)
  })

  it('filters activeVariants to only is_active=true', () => {
    vi.mocked(useProduct).mockReturnValue({
      data: {
        ...baseProduct,
        variants: [
          activeVariant,
          { ...activeVariant, id: 'v2', is_active: false },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.activeVariants).toHaveLength(1)
    expect(result.current.activeVariants[0].id).toBe('v1')
  })

  it('collects unique marketplaceIds from all variant listings', () => {
    vi.mocked(useProduct).mockReturnValue({
      data: {
        ...baseProduct,
        variants: [
          { ...activeVariant, marketplace_listings: [{ marketplace_id: 'shopee-1' }, { marketplace_id: 'tiktok-1' }] },
          { ...activeVariant, id: 'v2', marketplace_listings: [{ marketplace_id: 'shopee-1' }] },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.marketplaceIds).toHaveLength(2)
    expect(result.current.marketplaceIds).toContain('shopee-1')
    expect(result.current.marketplaceIds).toContain('tiktok-1')
  })
})

describe('price-edit state machine', () => {
  it('handleStartEditPrices sets editingPrices=true and seeds editedPrices', () => {
    vi.mocked(useProduct).mockReturnValue({
      data: { ...baseProduct, variants: [activeVariant] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.editingPrices).toBe(false)

    act(() => { result.current.handleStartEditPrices() })

    expect(result.current.editingPrices).toBe(true)
    expect(result.current.editedPrices['v1']).toBe(50000)
  })

  it('handleCancelPrices resets editingPrices and editedPrices', () => {
    vi.mocked(useProduct).mockReturnValue({
      data: { ...baseProduct, variants: [activeVariant] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => { result.current.handleStartEditPrices() })
    act(() => { result.current.handleCancelPrices() })

    expect(result.current.editingPrices).toBe(false)
    expect(result.current.editedPrices).toEqual({})
  })

  it('handleSavePrices success: calls mutateAsync, invalidates query, toasts, and resets', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    const mockInvalidate = vi.fn()
    vi.mocked(useSaveVariants).mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false } as never)
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mockInvalidate } as never)
    vi.mocked(useProduct).mockReturnValue({
      data: {
        ...baseProduct,
        variants: [activeVariant],
        variant_options: { size: ['S', 'M'] },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => { result.current.handleStartEditPrices() })

    await act(async () => { await result.current.handleSavePrices() })

    expect(mockMutateAsync).toHaveBeenCalledOnce()
    expect(mockInvalidate).toHaveBeenCalled()
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Prices saved')
    expect(result.current.editingPrices).toBe(false)
    expect(result.current.editedPrices).toEqual({})
  })

  it('handleSavePrices failure: toasts error and does not reset', async () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('server error'))
    vi.mocked(useSaveVariants).mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false } as never)
    vi.mocked(useProduct).mockReturnValue({
      data: { ...baseProduct, variants: [activeVariant] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => { result.current.handleStartEditPrices() })

    await act(async () => { await result.current.handleSavePrices() })

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to save prices')
    expect(result.current.editingPrices).toBe(true)
  })
})

describe('supplier-link edit', () => {
  it('handleSaveSupplierLink sends null when link is empty string', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateProductSupplier).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => {
      result.current.setEditingSupplierLinkId('ps1')
      result.current.setEditingSupplierLink('')
    })

    await act(async () => { await result.current.handleSaveSupplierLink() })

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'ps1', supplier_link: null })
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Supplier link updated')
    expect(result.current.editingSupplierLinkId).toBeNull()
  })

  it('handleSaveSupplierLink sends the trimmed link when non-empty', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateProductSupplier).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => {
      result.current.setEditingSupplierLinkId('ps1')
      result.current.setEditingSupplierLink('  https://alpha.com  ')
    })

    await act(async () => { await result.current.handleSaveSupplierLink() })

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'ps1', supplier_link: 'https://alpha.com' })
  })

  it('handleSaveSupplierLink on failure: toasts error, keeps dialog open', async () => {
    const mockMutateAsync = vi.fn().mockRejectedValue(new Error('network'))
    vi.mocked(useUpdateProductSupplier).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })
    act(() => {
      result.current.setEditingSupplierLinkId('ps1')
      result.current.setEditingSupplierLink('https://alpha.com')
    })

    await act(async () => { await result.current.handleSaveSupplierLink() })

    expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Failed to update supplier link')
    expect(result.current.editingSupplierLinkId).toBe('ps1')
  })

  it('handleSaveSupplierLink does nothing when editingSupplierLinkId is null', async () => {
    const mockMutateAsync = vi.fn()
    vi.mocked(useUpdateProductSupplier).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })

    await act(async () => { await result.current.handleSaveSupplierLink() })

    expect(mockMutateAsync).not.toHaveBeenCalled()
  })
})

describe('attach/detach business entity', () => {
  it('exposes attachMutation and detachMutation from hook', () => {
    const mockAttach = { mutate: vi.fn() }
    const mockDetach = { mutate: vi.fn() }
    vi.mocked(useAttachBusinessEntity).mockReturnValue(mockAttach as never)
    vi.mocked(useDetachBusinessEntity).mockReturnValue(mockDetach as never)

    const { result } = renderHook(() => useProductDetail(), { wrapper })

    expect(result.current.attachMutation).toBe(mockAttach)
    expect(result.current.detachMutation).toBe(mockDetach)
  })

  it('showAttachModal starts false, setShowAttachModal toggles it', () => {
    const { result } = renderHook(() => useProductDetail(), { wrapper })
    expect(result.current.showAttachModal).toBe(false)

    act(() => { result.current.setShowAttachModal(true) })
    expect(result.current.showAttachModal).toBe(true)
  })
})
