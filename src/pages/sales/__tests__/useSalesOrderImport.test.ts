/**
 * renderHook tests for useSalesOrderImport.
 * Seam: the hook's public interface (state + derived values + actions).
 */
import { renderHook, act } from '@testing-library/react'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import { useSalesOrderImport } from '../../../hooks/sales/useSalesOrderImport'
import type { ExcelImportPreviewResponse, ExcelImportConfirmResponse } from '../../../types/sales'

const basePreview: ExcelImportPreviewResponse = {
  file_summary: { total_rows: 10, date_from: '2026-06-06', date_to: '2026-07-06' },
  new_orders: [
    { order_number: 'ORD-001', mapped_status: 'CONFIRMED', item_count: 2, order_date: '2026-06-10' },
    { order_number: 'ORD-002', mapped_status: 'PENDING', item_count: 1, order_date: '2026-06-11' },
  ],
  status_updates: [
    { order_number: 'ORD-003', current_status: 'PENDING', new_status: 'DELIVERED' },
  ],
  cancellation_transitions: [],
  skipped_already_cancelled: 1,
  unmatched_skus: [],
}

const baseConfirm: ExcelImportConfirmResponse = {
  created: 2,
  updated: 1,
  skipped_cancelled: 0,
  skipped_unmatched: 0,
  stock_deducted_orders: 1,
  returns_queued: 0,
  errors: [],
}

beforeEach(() => vi.clearAllMocks())

describe('initial state', () => {
  it('starts on upload step', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.step).toBe('upload')
  })

  it('file starts null', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.file).toBeNull()
  })

  it('marketplaceId and warehouseId start empty', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.marketplaceId).toBe('')
    expect(result.current.warehouseId).toBe('')
  })

  it('previewData and resultData start null', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.previewData).toBeNull()
    expect(result.current.resultData).toBeNull()
  })

  it('skipUnmatched starts false', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.skipUnmatched).toBe(false)
  })

  it('showSkuModal starts false', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.showSkuModal).toBe(false)
  })
})

describe('derived values', () => {
  it('unresolvedCount is 0 when no previewData', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.unresolvedCount).toBe(0)
  })

  it('unresolvedCount counts unmatched_skus without a mapping', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    const previewWithUnmatched: ExcelImportPreviewResponse = {
      ...basePreview,
      unmatched_skus: [
        { shopee_sku: 'SKU-001', product_name: 'Product A', order_number: 'ORD-001' },
        { shopee_sku: 'SKU-002', product_name: 'Product B', order_number: 'ORD-002' },
      ],
    }
    act(() => { result.current.setPreviewData(previewWithUnmatched) })
    expect(result.current.unresolvedCount).toBe(2)

    act(() => { result.current.setSkuMappings([{ shopee_sku: 'SKU-001', variant_id: 'v1' }]) })
    expect(result.current.unresolvedCount).toBe(1)
  })

  it('hasNothingToDo is true when new_orders, status_updates, cancellations are all empty', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    const emptyPreview: ExcelImportPreviewResponse = {
      file_summary: { total_rows: 0, date_from: null, date_to: null },
      new_orders: [],
      status_updates: [],
      cancellation_transitions: [],
      skipped_already_cancelled: 0,
      unmatched_skus: [],
    }
    act(() => { result.current.setPreviewData(emptyPreview) })
    expect(result.current.hasNothingToDo).toBe(true)
  })

  it('hasNothingToDo is false when there are new_orders', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    act(() => { result.current.setPreviewData(basePreview) })
    expect(result.current.hasNothingToDo).toBe(false)
  })

  it('stockEligibleCount counts only CONFIRMED/SHIPPING/DELIVERED/COMPLETED orders', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    act(() => { result.current.setPreviewData(basePreview) })
    // basePreview has 1 CONFIRMED order, 1 PENDING — only CONFIRMED qualifies
    expect(result.current.stockEligibleCount).toBe(1)
  })

  it('stockEligibleCount is 0 when no previewData', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    expect(result.current.stockEligibleCount).toBe(0)
  })
})

describe('handleClose', () => {
  it('resets all state and calls onClose', () => {
    const onClose = vi.fn()
    const { result } = renderHook(() => useSalesOrderImport(onClose))

    act(() => {
      result.current.setStep('preview')
      result.current.setMarketplaceId('mp1')
      result.current.setWarehouseId('w1')
      result.current.setPreviewData(basePreview)
      result.current.setSkipUnmatched(true)
      result.current.setShowSkuModal(true)
    })

    act(() => { result.current.handleClose() })

    expect(result.current.step).toBe('upload')
    expect(result.current.marketplaceId).toBe('')
    expect(result.current.warehouseId).toBe('')
    expect(result.current.previewData).toBeNull()
    expect(result.current.skipUnmatched).toBe(false)
    expect(result.current.showSkuModal).toBe(false)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('setPreviewData / setResultData / step transitions', () => {
  it('setPreviewData populates previewData', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    act(() => { result.current.setPreviewData(basePreview) })
    expect(result.current.previewData).toEqual(basePreview)
  })

  it('setResultData populates resultData', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    act(() => { result.current.setResultData(baseConfirm) })
    expect(result.current.resultData).toEqual(baseConfirm)
  })

  it('setStep changes the step', () => {
    const { result } = renderHook(() => useSalesOrderImport(vi.fn()))
    act(() => { result.current.setStep('confirm') })
    expect(result.current.step).toBe('confirm')
  })
})
