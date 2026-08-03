/**
 * renderHook tests for useStockPage.
 * Seam: the hook's public interface (state + action handlers).
 */
import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import React from 'react'
import { useStockPage } from '../../../hooks/inventory/useStockPage'
import { toast } from '../../../lib/toast'

vi.mock('../../../hooks/api/inventory', () => ({
  useProductVariantStocks: vi.fn(),
  useWarehouses: vi.fn(),
  useAdjustStock: vi.fn(),
  useProductVariants: vi.fn(),
  useAllVariants: vi.fn(),
  useBulkUpdateInventory: vi.fn(),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

import { useProductVariantStocks, useWarehouses, useAdjustStock } from '../../../hooks/api/inventory'
import { useAuth } from '../../../contexts/AuthContext'

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
  return { data, isLoading: false, refetch: vi.fn() } as never
}

function mutationMock(overrides?: Record<string, unknown>) {
  return { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, ...overrides } as never
}

const mockWarehouses = {
  results: [
    { id: 'w1', name: 'Warehouse A', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
    { id: 'w2', name: 'Warehouse B', company: 'c1', address: '', is_active: true, cdate: '', udate: '' },
  ],
  count: 2, next: null, previous: null,
}

const mockVariant = {
  id: 'v1', name: 'Red Shirt', sku_variant_code: 'RS-001', product: 'p1',
  product_name: 'Shirt', product_sku: 'SHT', category_name: 'Apparel',
  base_price: 100, total_available_qty: 10, physical_qty: 10, is_active: true,
  product_supplier_link: null, product_photo_url: null,
  last_unit_price_foreign: null, last_currency: null, last_discounted_unit_price_foreign: null,
}

const mockVariant2 = {
  id: 'v2', name: 'Blue Shirt', sku_variant_code: 'BS-002', product: 'p1',
  product_name: 'Shirt', product_sku: 'SHT', category_name: 'Apparel',
  base_price: 100, total_available_qty: 5, physical_qty: 5, is_active: true,
  product_supplier_link: null, product_photo_url: null,
  last_unit_price_foreign: null, last_currency: null, last_discounted_unit_price_foreign: null,
}

const mockStockData = {
  results: [mockVariant, mockVariant2],
  count: 2, next: null, previous: null,
}

const mockAuth = { user: { is_staff: true }, isLoading: false }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue(mockAuth as never)
  vi.mocked(useWarehouses).mockReturnValue(hookResult(mockWarehouses))
  vi.mocked(useProductVariantStocks).mockReturnValue(hookResult(mockStockData))
  vi.mocked(useAdjustStock).mockReturnValue(mutationMock())
})

describe('initial state', () => {
  it('page starts at 1', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.page).toBe(1)
  })

  it('selectedWarehouse starts empty', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.selectedWarehouse).toBe('')
  })

  it('canEdit is false when no warehouse selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.canEdit).toBe(false)
  })

  it('canEdit is true after warehouse is set', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.setSelectedWarehouse('w1') })
    expect(result.current.canEdit).toBe(true)
  })

  it('pending starts empty', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(Object.keys(result.current.pending)).toHaveLength(0)
  })

  it('selected starts empty', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.selected.size).toBe(0)
  })

  it('isStaff reflects user.is_staff', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.isStaff).toBe(true)
  })

  it('isStaff is false for non-staff user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { is_staff: false }, isLoading: false } as never)
    const { result } = renderHook(() => useStockPage(), { wrapper })
    expect(result.current.isStaff).toBe(false)
  })
})

describe('stageChange', () => {
  it('stageChange sets rowTypes entry for the variant', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.stageChange(mockVariant, 'add') })
    expect(result.current.rowTypes['v1']).toBe('add')
  })

  it('stageChange with "min" sets rowTypes to min', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.stageChange(mockVariant, 'min') })
    expect(result.current.rowTypes['v1']).toBe('min')
  })

  it('stageChange with "set" sets rowTypes to set', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.stageChange(mockVariant, 'set') })
    expect(result.current.rowTypes['v1']).toBe('set')
  })
})

describe('unstage', () => {
  it('removes the variant from rowTypes, rowInputs, and pending', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.stageChange(mockVariant, 'add')
      result.current.setRowInputs(prev => ({ ...prev, 'v1': '5' }))
    })
    act(() => { result.current.unstage('v1') })
    expect(result.current.rowTypes['v1']).toBeUndefined()
    expect(result.current.rowInputs['v1']).toBeUndefined()
    expect(result.current.pending['v1']).toBeUndefined()
  })
})

describe('clearAll', () => {
  it('clears all pending, rowInputs, rowTypes, and selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.stageChange(mockVariant, 'add')
      result.current.toggleSelect('v1')
    })
    act(() => { result.current.clearAll() })
    expect(Object.keys(result.current.pending)).toHaveLength(0)
    expect(Object.keys(result.current.rowTypes)).toHaveLength(0)
    expect(result.current.selected.size).toBe(0)
  })
})

describe('applyBulkEdit', () => {
  it('stages changes in pending for all selected variants', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    act(() => { result.current.applyBulkEdit('add', 5) })
    expect(result.current.pending['v1']).toMatchObject({ type: 'add', qty: 5 })
  })

  it('calls toast.success with variant count', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    act(() => { result.current.applyBulkEdit('min', 3) })
    expect(toast.success).toHaveBeenCalledWith('Staged for 1 variant')
  })

  it('stages for multiple selected variants', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.toggleSelect('v1')
      result.current.toggleSelect('v2')
    })
    act(() => { result.current.applyBulkEdit('set', 10) })
    expect(result.current.pending['v1']).toMatchObject({ type: 'set', qty: 10 })
    expect(result.current.pending['v2']).toMatchObject({ type: 'set', qty: 10 })
    expect(toast.success).toHaveBeenCalledWith('Staged for 2 variants')
  })
})

describe('saveChanges', () => {
  it('calls adjustMutation.mutateAsync for rowType-staged change', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync, isPending: false } as never)
    const { result } = renderHook(() => useStockPage(), { wrapper })

    act(() => {
      result.current.setSelectedWarehouse('w1')
      result.current.stageChange(mockVariant, 'add')
      result.current.setRowInputs(prev => ({ ...prev, 'v1': '5' }))
    })

    await act(async () => {
      await result.current.saveChanges(['v1'])
    })

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ variant_id: 'v1', warehouse_id: 'w1', type: 'add', qty: 5 }),
    )
  })

  it('calls adjustMutation.mutateAsync for pending (bulk-edit) staged change', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync, isPending: false } as never)
    const { result } = renderHook(() => useStockPage(), { wrapper })

    act(() => {
      result.current.setSelectedWarehouse('w1')
      result.current.toggleSelect('v1')
    })
    act(() => { result.current.applyBulkEdit('min', 2) })

    await act(async () => {
      await result.current.saveChanges(['v1'])
    })

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ variant_id: 'v1', warehouse_id: 'w1', type: 'min', qty: 2 }),
    )
  })

  it('clears staged state after save succeeds', async () => {
    vi.mocked(useAdjustStock).mockReturnValue(mutationMock())
    const { result } = renderHook(() => useStockPage(), { wrapper })

    act(() => {
      result.current.setSelectedWarehouse('w1')
      result.current.stageChange(mockVariant, 'add')
      result.current.setRowInputs(prev => ({ ...prev, 'v1': '5' }))
    })

    await act(async () => {
      await result.current.saveChanges(['v1'])
    })

    expect(result.current.rowTypes['v1']).toBeUndefined()
    expect(result.current.rowInputs['v1']).toBeUndefined()
  })

  it('shows error toast when no staged changes', async () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.setSelectedWarehouse('w1') })
    await act(async () => { await result.current.saveChanges(['v1']) })
    expect(toast.error).toHaveBeenCalledWith('No staged changes to save')
  })

  it('does nothing if no warehouse is selected', async () => {
    const mutateAsync = vi.fn()
    vi.mocked(useAdjustStock).mockReturnValue({ mutateAsync, isPending: false } as never)
    const { result } = renderHook(() => useStockPage(), { wrapper })
    // no warehouse set
    act(() => { result.current.stageChange(mockVariant, 'add') })
    await act(async () => { await result.current.saveChanges(['v1']) })
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})

describe('selection toggles', () => {
  it('toggleSelect adds an id to selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    expect(result.current.selected.has('v1')).toBe(true)
  })

  it('toggleSelect removes an already-selected id', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    act(() => { result.current.toggleSelect('v1') })
    expect(result.current.selected.has('v1')).toBe(false)
  })

  it('toggleSelectAll selects all on-page variants when none are selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelectAll() })
    expect(result.current.selected.has('v1')).toBe(true)
    expect(result.current.selected.has('v2')).toBe(true)
  })

  it('toggleSelectAll deselects all when all are already selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelectAll() })
    act(() => { result.current.toggleSelectAll() })
    expect(result.current.selected.size).toBe(0)
  })

  it('clearSelection empties selected set', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.toggleSelect('v1')
      result.current.toggleSelect('v2')
    })
    act(() => { result.current.clearSelection() })
    expect(result.current.selected.size).toBe(0)
  })
})

describe('derived values', () => {
  it('pendingIds includes ids from pending and valid rowTypes', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.stageChange(mockVariant, 'add')
      result.current.setRowInputs(prev => ({ ...prev, 'v1': '5' }))
    })
    expect(result.current.pendingIds).toContain('v1')
  })

  it('selectedPendingIds is the intersection of selected and pending', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.toggleSelect('v1')
      result.current.toggleSelect('v2')
    })
    act(() => { result.current.applyBulkEdit('add', 5) })
    expect(result.current.selectedPendingIds).toContain('v1')
    expect(result.current.selectedPendingIds).toContain('v2')
  })

  it('selectedVariants returns data results that are in selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    expect(result.current.selectedVariants).toHaveLength(1)
    expect(result.current.selectedVariants[0].id).toBe('v1')
  })

  it('allOnPageSelected is true when all on-page variants are selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelectAll() })
    expect(result.current.allOnPageSelected).toBe(true)
  })

  it('allOnPageSelected is false when only some are selected', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => { result.current.toggleSelect('v1') })
    expect(result.current.allOnPageSelected).toBe(false)
  })
})

describe('commitSearch', () => {
  it('resets page to 1 and clears selection', () => {
    const { result } = renderHook(() => useStockPage(), { wrapper })
    act(() => {
      result.current.setPage(3)
      result.current.toggleSelect('v1')
      result.current.setSearchInput('shirt')
    })
    act(() => { result.current.commitSearch() })
    expect(result.current.page).toBe(1)
    expect(result.current.selected.size).toBe(0)
  })
})
