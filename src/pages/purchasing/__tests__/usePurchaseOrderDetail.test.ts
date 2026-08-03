/**
 * renderHook tests for usePurchaseOrderDetail.
 * Seam: the hook's public interface (state + actions).
 */
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, it, expect, describe, beforeEach } from 'vitest'
import React from 'react'
import { usePurchaseOrderDetail } from '../../../hooks/purchasing/usePurchaseOrderDetail'
import { toast } from '../../../lib/toast'
import type { PurchaseOrder, ReplenishmentItem } from '../../../types/purchasing'

vi.mock('../../../lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(MemoryRouter, null, children)
}

const emptyStockMap = new Map<string, ReplenishmentItem>()

function makeBasePo(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: 'po-1',
    company: 'c1',
    warehouse: 'w1',
    warehouse_name: 'Warehouse 1',
    company_name: 'Company 1',
    purchase_order_number: 'PO-001',
    status: 'DRAFT',
    supplier_name: 'Supplier A',
    supplier_id: null,
    forwarder_name: null,
    shop_services: null,
    commission_fee_pct: null,
    commission_fee: null,
    commission_fee_rmb: null,
    delivery_fee: null,
    delivery_fee_idr: null,
    currency: 'CNY',
    exchange_rate: '15000',
    cbm: null,
    weight: null,
    shipping_fee_per_cbm: null,
    shipping_fee: null,
    total_ordered_qty: 0,
    total_received_qty: 0,
    total_item_amount: null,
    total_order_amount: null,
    total_amount: 0,
    procure_amount: null,
    refund_amount: null,
    cost_ratio_cogs: 0,
    shipping_per_qty: 0,
    invoice_number: null,
    invoice_date: null,
    delivery_order_number: null,
    delivery_date: null,
    forecast_delivery_date: null,
    forecast_cbm: null,
    forecast_shipping_fee: null,
    forecast_shipping_fee_per_cbm: null,
    purchase_order_invoice_file: null,
    delivery_order_file: null,
    delivery_order_invoice_file: null,
    packing_list_file: null,
    note: null,
    has_discount: false,
    editable_fields: { header: [], order_detail: [] },
    next_status: null,
    status_history: [],
    order_details: [],
    cdate: '2024-01-01',
    udate: '2024-01-01',
    ...overrides,
  }
}

function renderDetailHook(po: PurchaseOrder | undefined, isCreating = false) {
  const createMutateAsync = vi.fn().mockResolvedValue({ id: 'new-po' })
  const updateMutateAsync = vi.fn().mockResolvedValue({ data: {} })
  const result = renderHook(
    () => usePurchaseOrderDetail({ po, isCreating, stockMap: emptyStockMap, createMutateAsync, updateMutateAsync }),
    { wrapper },
  )
  return { ...result, createMutateAsync, updateMutateAsync }
}

beforeEach(() => vi.clearAllMocks())

describe('initial state', () => {
  it('starts with editMode=false for existing PO', () => {
    const { result } = renderDetailHook(makeBasePo())
    expect(result.current.editMode).toBe(false)
  })

  it('starts with editMode=true when isCreating', () => {
    const { result } = renderDetailHook(undefined, true)
    expect(result.current.editMode).toBe(true)
  })

  it('reflects po.has_discount as initial hasDiscount', () => {
    const po = makeBasePo({ has_discount: true })
    const { result } = renderDetailHook(po)
    expect(result.current.hasDiscount).toBe(true)
  })

  it('avgWindow defaults to 30', () => {
    const { result } = renderDetailHook(makeBasePo())
    expect(result.current.avgWindow).toBe(30)
  })

  it('groupBy defaults to product', () => {
    const { result } = renderDetailHook(makeBasePo())
    expect(result.current.groupBy).toBe('product')
  })
})

describe('enterEditMode / cancelEditMode', () => {
  it('enterEditMode sets editMode=true and seeds headerValues from editable_fields', () => {
    const po = makeBasePo({
      editable_fields: { header: ['exchange_rate'], order_detail: [] },
      exchange_rate: '15000',
    })
    const { result } = renderDetailHook(po)
    act(() => { result.current.enterEditMode() })
    expect(result.current.editMode).toBe(true)
    expect(result.current.headerValues.exchange_rate).toBe('15000')
  })

  it('cancelEditMode resets editMode and clears all draft state', () => {
    const po = makeBasePo({ editable_fields: { header: ['exchange_rate'], order_detail: [] } })
    const { result } = renderDetailHook(po)
    act(() => { result.current.enterEditMode() })
    act(() => { result.current.setHeaderField('exchange_rate', '20000') })
    act(() => { result.current.cancelEditMode() })
    expect(result.current.editMode).toBe(false)
    expect(result.current.headerValues).toEqual({})
    expect(result.current.newItems).toHaveLength(0)
    expect(result.current.deletedDetailIds.size).toBe(0)
  })
})

describe('handleSave', () => {
  it('calls updateMutateAsync with has_discount and toasts success', async () => {
    const po = makeBasePo({ editable_fields: { header: [], order_detail: [] } })
    const { result, updateMutateAsync } = renderDetailHook(po)
    act(() => { result.current.enterEditMode() })
    await act(async () => { await result.current.handleSave() })
    expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'po-1', data: expect.objectContaining({ has_discount: false }) })
    expect(vi.mocked(toast).success).toHaveBeenCalledWith('Purchase order updated')
  })

  it('toasts compressed_files label when response includes compressed_files', async () => {
    const po = makeBasePo({ editable_fields: { header: [], order_detail: [] } })
    const { result, updateMutateAsync } = renderDetailHook(po)
    updateMutateAsync.mockResolvedValue({ data: { compressed_files: ['purchase_order_invoice_file'] } })
    act(() => { result.current.enterEditMode() })
    await act(async () => { await result.current.handleSave() })
    expect(vi.mocked(toast).info).toHaveBeenCalledWith(expect.stringContaining('PO Invoice File'))
  })

  it('sets validationErrors on server error with field dict', async () => {
    const po = makeBasePo({ editable_fields: { header: [], order_detail: [] } })
    const { result, updateMutateAsync } = renderDetailHook(po)
    updateMutateAsync.mockRejectedValue({ response: { data: { exchange_rate: ['Invalid value.'] } } })
    act(() => { result.current.enterEditMode() })
    await act(async () => { await result.current.handleSave() })
    expect(result.current.validationErrors).toContain('Exchange Rate: Invalid value.')
  })
})

describe('currency change autofill', () => {
  it('fills zero-price items when currency matches last_currency', () => {
    const po = makeBasePo({
      currency: 'USD',
      has_discount: false,
      editable_fields: { header: ['currency'], order_detail: ['unit_price_foreign'] },
      order_details: [{
        id: 'd1', variant_id: 'v1', product_variant_name: 'V1', product_id: 'p1',
        product_name: 'P', product_supplier_link: null, product_photo_url: null,
        ordered_qty: 1, received_qty: null, unit_price_foreign: null, unit_price_base: null,
        discounted_unit_price_foreign: null, discounted_unit_price_base: null,
        total_price_foreign: null, total_price_base: null,
        discounted_total_price_foreign: null, discounted_total_price_base: null,
        remarks: '', avg_sales: null, avg_sales_7d: null, stock_on_hand: 0, incoming_qty: 0,
        variant_values: {}, last_currency: 'CNY', last_unit_price_foreign: '25.00',
        last_discounted_unit_price_foreign: null, shipping_per_unit_idr: null,
        delivery_per_unit_idr: null, commission_per_unit_idr: null, cogs_per_unit_idr: null,
        product_has_dimensions: null, product_dim1_key: null, sku_variant_code: undefined,
      }],
    })
    const { result } = renderDetailHook(po)
    act(() => { result.current.enterEditMode() })
    act(() => { result.current.handleCurrencyChange('currency', 'CNY') })
    expect(result.current.detailValues['d1']?.unit_price_foreign).toBe('25.00')
    expect(vi.mocked(toast).info).toHaveBeenCalledWith('Unit prices auto-filled from last purchase price')
  })

  it('warns when existing priced items exist on currency change', () => {
    const po = makeBasePo({
      currency: 'USD',
      has_discount: false,
      editable_fields: { header: ['currency'], order_detail: ['unit_price_foreign'] },
      order_details: [{
        id: 'd1', variant_id: 'v1', product_variant_name: 'V1', product_id: 'p1',
        product_name: 'P', product_supplier_link: null, product_photo_url: null,
        ordered_qty: 1, received_qty: null, unit_price_foreign: '17.50', unit_price_base: null,
        discounted_unit_price_foreign: null, discounted_unit_price_base: null,
        total_price_foreign: null, total_price_base: null,
        discounted_total_price_foreign: null, discounted_total_price_base: null,
        remarks: '', avg_sales: null, avg_sales_7d: null, stock_on_hand: 0, incoming_qty: 0,
        variant_values: {}, last_currency: null, last_unit_price_foreign: null,
        last_discounted_unit_price_foreign: null, shipping_per_unit_idr: null,
        delivery_per_unit_idr: null, commission_per_unit_idr: null, cogs_per_unit_idr: null,
        product_has_dimensions: null, product_dim1_key: null, sku_variant_code: undefined,
      }],
    })
    const { result } = renderDetailHook(po)
    act(() => { result.current.enterEditMode() })
    act(() => { result.current.handleCurrencyChange('currency', 'CNY') })
    expect(vi.mocked(toast).warning).toHaveBeenCalledWith('Currency changed — existing prices may be in the old currency')
  })
})

describe('getItemStockData', () => {
  it('returns finite DOI when avg_sales=0 (floored to 1/avgWindow)', () => {
    const po = makeBasePo({
      order_details: [{
        id: 'd1', variant_id: 'v1', product_variant_name: 'V1', product_id: 'p1',
        product_name: 'P', product_supplier_link: null, product_photo_url: null,
        ordered_qty: 5, received_qty: null, unit_price_foreign: '10', unit_price_base: null,
        discounted_unit_price_foreign: null, discounted_unit_price_base: null,
        total_price_foreign: null, total_price_base: null,
        discounted_total_price_foreign: null, discounted_total_price_base: null,
        remarks: '', avg_sales: '0', avg_sales_7d: '0', stock_on_hand: 20, incoming_qty: 0,
        variant_values: {}, last_currency: null, last_unit_price_foreign: null,
        last_discounted_unit_price_foreign: null, shipping_per_unit_idr: null,
        delivery_per_unit_idr: null, commission_per_unit_idr: null, cogs_per_unit_idr: null,
        product_has_dimensions: null, product_dim1_key: null, sku_variant_code: undefined,
      }],
    })
    const { result } = renderDetailHook(po)
    const item = po.order_details![0]
    const data = result.current.getItemStockData(item)
    // avg_sales=0, hasData=true → avg=1/30; soh=20 → doi=600; soh+ordered=25 → doiAfter=750
    expect(data.doi).toBe(600)
    expect(data.doiAfter).toBe(750)
    expect(data.recommendedQty).toBe(0) // ceil(1/30*90 - 20 - 0) = ceil(-17) = 0
  })

  it('returns recommendedQty=875 for avg_sales=10, soh=20, incoming=5', () => {
    const po = makeBasePo({
      order_details: [{
        id: 'd1', variant_id: 'v1', product_variant_name: 'V1', product_id: 'p1',
        product_name: 'P', product_supplier_link: null, product_photo_url: null,
        ordered_qty: 5, received_qty: null, unit_price_foreign: '10', unit_price_base: null,
        discounted_unit_price_foreign: null, discounted_unit_price_base: null,
        total_price_foreign: null, total_price_base: null,
        discounted_total_price_foreign: null, discounted_total_price_base: null,
        remarks: '', avg_sales: '10', avg_sales_7d: '12', stock_on_hand: 20, incoming_qty: 5,
        variant_values: {}, last_currency: null, last_unit_price_foreign: null,
        last_discounted_unit_price_foreign: null, shipping_per_unit_idr: null,
        delivery_per_unit_idr: null, commission_per_unit_idr: null, cogs_per_unit_idr: null,
        product_has_dimensions: null, product_dim1_key: null, sku_variant_code: undefined,
      }],
    })
    const { result } = renderDetailHook(po)
    const data = result.current.getItemStockData(po.order_details![0])
    // avg=10, target=10*90=900, soh+incoming=25 → rec=max(0,ceil(900-25))=875
    expect(data.recommendedQty).toBe(875)
  })
})

describe('liveCommissionFee', () => {
  it('computes live commission from pct and order_details when pct is set', () => {
    const po = makeBasePo({
      commission_fee_pct: 5,
      exchange_rate: '15000',
      order_details: [{
        id: 'd1', variant_id: 'v1', product_variant_name: 'V1', product_id: 'p1',
        product_name: 'P', product_supplier_link: null, product_photo_url: null,
        ordered_qty: 1, received_qty: null, unit_price_foreign: '1000', unit_price_base: 15000000,
        discounted_unit_price_foreign: null, discounted_unit_price_base: null,
        total_price_foreign: '1000', total_price_base: 15000000,
        discounted_total_price_foreign: null, discounted_total_price_base: null,
        remarks: '', avg_sales: null, avg_sales_7d: null, stock_on_hand: 0, incoming_qty: 0,
        variant_values: {}, last_currency: null, last_unit_price_foreign: null,
        last_discounted_unit_price_foreign: null, shipping_per_unit_idr: null,
        delivery_per_unit_idr: null, commission_per_unit_idr: null, cogs_per_unit_idr: null,
        product_has_dimensions: null, product_dim1_key: null, sku_variant_code: undefined,
      }],
    })
    const { result } = renderDetailHook(po)
    // 1000 * 0.05 * 15000 = 750000
    expect(result.current.liveCommissionFee).toBe(750000)
  })

  it('returns null when commission_fee_pct is null', () => {
    const po = makeBasePo({ commission_fee_pct: null, commission_fee: 500000 })
    const { result } = renderDetailHook(po)
    expect(result.current.liveCommissionFee).toBeNull()
  })
})
