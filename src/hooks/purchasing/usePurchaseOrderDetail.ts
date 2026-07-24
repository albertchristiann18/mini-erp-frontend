/**
 * usePurchaseOrderDetail — state machine for PurchaseOrderDetailPage.
 *
 * Owns: edit/validate/save logic, currency-change autofill, derived stock/
 * COGS/commission values, and group-by/collapse state.
 * Components receive a view-model slice + callbacks; they never touch api/ directly.
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../../lib/toast'
import type { PurchaseOrderDetail } from '../../types/purchasing'
import { HEADER_FIELD_LABELS, computeItemStockData } from './purchaseOrderDetailHelpers'
import type {
  ModalDraftItem,
  NewItem,
  ItemStockData,
  UsePurchaseOrderDetailProps,
  UsePurchaseOrderDetailResult,
} from './purchaseOrderDetailHelpers'

export type { ModalDraftItem, NewItem, ItemStockData, UsePurchaseOrderDetailProps, UsePurchaseOrderDetailResult }

export function usePurchaseOrderDetail({
  po,
  isCreating,
  stockMap,
  createMutateAsync,
  updateMutateAsync,
}: UsePurchaseOrderDetailProps): UsePurchaseOrderDetailResult {
  const navigate = useNavigate()

  const [editMode, setEditMode] = useState(isCreating)
  const [headerValues, setHeaderValues] = useState<Record<string, string | File>>({})
  const [detailValues, setDetailValues] = useState<Record<string, Record<string, string>>>({})
  const [deletedDetailIds, setDeletedDetailIds] = useState<Set<string>>(new Set())
  const [newItems, setNewItems] = useState<NewItem[]>([])
  const [hasDiscount, setHasDiscount] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [avgWindow, setAvgWindow] = useState<7 | 14 | 30>(30)
  const [groupBy, setGroupBy] = useState<string>('product')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!po) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupBy('product')
    setHasDiscount(po.has_discount ?? false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- po is compared by id
  }, [po?.id])

  const availableGroupKeys = useMemo<string[]>(() => {
    const keySet = new Set<string>()
    for (const item of (po?.order_details ?? [])) {
      for (const key of Object.keys(item.variant_values ?? {})) keySet.add(key)
    }
    return Array.from(keySet)
  }, [po?.order_details])

  const usedVariantIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>()
    for (const item of (po?.order_details ?? [])) {
      if (!deletedDetailIds.has(item.id)) ids.add(item.variant_id)
    }
    for (const n of newItems) { if (n.product_variant_id) ids.add(n.product_variant_id) }
    return ids
  }, [po?.order_details, deletedDetailIds, newItems])

  const activeSupplierId: string | undefined =
    (po?.supplier_id as string | undefined) ??
    (headerValues.supplier_id ? String(headerValues.supplier_id) : undefined)

  const canAddDeleteItems = isCreating || (po?.status ?? '') === 'DRAFT' || (po?.status ?? '') === 'ORDERED'

  const allGroupKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const item of (po?.order_details ?? []).filter(i => !deletedDetailIds.has(i.id))) {
      if (groupBy === 'product') keys.add(item.product_id || 'unknown')
      else if (groupBy === 'flat') keys.add(item.id)
      else keys.add(`${item.product_id}_${item.variant_values?.[groupBy] ?? 'Other'}`)
    }
    if (editMode && canAddDeleteItems) {
      for (const n of newItems) keys.add(n.product_id || `new-${n._tempId}`)
    }
    return [...keys]
  }, [po?.order_details, groupBy, deletedDetailIds, editMode, canAddDeleteItems, newItems])

  const allCollapsed = allGroupKeys.length > 0 && allGroupKeys.every(k => collapsedGroups.has(k))

  const poExchangeRate = isCreating ? Number(headerValues.exchange_rate || 0) : Number(po?.exchange_rate ?? 0)
  const effectiveShipping = isCreating ? 0 : (po?.shipping_fee ?? po?.forecast_shipping_fee ?? 0)
  const freightPerUnit = isCreating ? 0
    : (po != null && po.total_ordered_qty > 0 ? Math.round(effectiveShipping / po.total_ordered_qty) : 0)

  const livePct = editMode
    ? (headerValues.commission_fee_pct != null
        ? Number(headerValues.commission_fee_pct)
        : (po?.commission_fee_pct != null ? Number(po.commission_fee_pct) : null))
    : (po?.commission_fee_pct != null ? Number(po.commission_fee_pct) : null)

  const liveCommissionFee = !isCreating && po != null && livePct != null
    ? Math.round(
        (po.order_details ?? []).reduce((s, i) => s + Number(hasDiscount
          ? (i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0)
          : (i.total_price_foreign ?? i.discounted_total_price_foreign ?? 0)), 0,
        ) * (livePct / 100) *
        (editMode ? (Number(headerValues.exchange_rate) || Number(po.exchange_rate) || 0) : Number(po.exchange_rate ?? 0)),
      )
    : null

  const commissionPerUnit = isCreating ? 0
    : (po != null && po.total_ordered_qty > 0
        ? Math.round((liveCommissionFee ?? po.commission_fee ?? 0) / po.total_ordered_qty) : 0)

  const computedGoodsAmount = isCreating ? 0
    : (po?.order_details ?? []).reduce((s, i) =>
        s + (hasDiscount ? (i.discounted_total_price_base ?? i.total_price_base ?? 0) : (i.total_price_base ?? i.discounted_total_price_base ?? 0)), 0)

  const deliveryFeeIdr = isCreating ? 0
    : Math.round(Number(po?.delivery_fee ?? 0) * Number(po?.exchange_rate ?? 0))

  const getItemStockData = (item: PurchaseOrderDetail): ItemStockData =>
    computeItemStockData(item, stockMap, avgWindow)

  const enterEditMode = () => {
    if (isCreating || !po) return
    const initial: Record<string, string | File> = {}
    const FILE_FIELDS = ['purchase_order_invoice_file', 'delivery_order_file', 'delivery_order_invoice_file', 'packing_list_file']
    for (const field of po.editable_fields.header) {
      if (field === 'note') { initial[field] = po.note ?? ''; continue }
      if (FILE_FIELDS.includes(field)) continue
      const val = (po as unknown as Record<string, unknown>)[field]
      if (val != null && val !== '') initial[field] = String(val)
    }
    const initDetails: Record<string, Record<string, string>> = {}
    for (const item of po.order_details ?? []) {
      const row: Record<string, string> = {}
      for (const field of po.editable_fields.order_detail) {
        const val = (item as unknown as Record<string, unknown>)[field]
        if (val != null) row[field] = String(val)
      }
      if (Object.keys(row).length > 0) initDetails[item.id] = row
    }
    setHeaderValues(initial); setDetailValues(initDetails)
    setEditMode(true); setDeletedDetailIds(new Set()); setNewItems([])
  }

  const cancelEditMode = () => {
    setEditMode(false); setHeaderValues({}); setDetailValues({})
    setDeletedDetailIds(new Set()); setNewItems([])
  }

  const setHeaderField = (field: string, value: string | File) =>
    setHeaderValues(prev => ({ ...prev, [field]: value }))

  const setDetailField = (itemId: string, field: string, value: string) =>
    setDetailValues(prev => ({ ...prev, [itemId]: { ...(prev[itemId] ?? {}), [field]: value } }))

  const handleCurrencyChange = (field: string, val: string | File) => {
    setHeaderField(field, val)
    if (field !== 'currency' || typeof val !== 'string') return
    let filledCount = 0
    let existingPricedCount = 0
    for (const item of po?.order_details ?? []) {
      if (deletedDetailIds.has(item.id)) continue
      const currentPrice = detailValues[item.id]?.unit_price_foreign ?? item.unit_price_foreign
      const isEmpty = !currentPrice || Number(currentPrice) === 0
      if (!isEmpty) { existingPricedCount++; continue }
      if (item.last_currency === val && item.last_unit_price_foreign) {
        setDetailField(item.id, 'unit_price_foreign', item.last_unit_price_foreign)
        if (po?.has_discount && item.last_discounted_unit_price_foreign) {
          const curDisc = detailValues[item.id]?.discounted_unit_price_foreign ?? item.discounted_unit_price_foreign
          if (!curDisc || Number(curDisc) === 0)
            setDetailField(item.id, 'discounted_unit_price_foreign', item.last_discounted_unit_price_foreign)
        }
        filledCount++
      }
    }
    if (filledCount > 0) toast.info('Unit prices auto-filled from last purchase price')
    if (existingPricedCount > 0) toast.warning('Currency changed — existing prices may be in the old currency')
  }

  const handleAddItemFromModal = (items: ModalDraftItem[]) => {
    const ts = Date.now()
    setNewItems(prev => [...prev, ...items.map((item, i) => ({ ...item, _tempId: `new-${ts}-${prev.length + i}` }))])
  }

  const removeNewItem = (_tempId: string) => setNewItems(prev => prev.filter(n => n._tempId !== _tempId))
  const updateNewItem = (_tempId: string, field: string, value: string) =>
    setNewItems(prev => prev.map(n => n._tempId === _tempId ? { ...n, [field]: value } : n))
  const deleteExistingItem = (itemId: string) =>
    setDeletedDetailIds(prev => new Set([...prev, itemId]))
  const toggleGroupCollapse = (key: string) =>
    setCollapsedGroups(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })

  const handleCreate = async () => {
    const errors: string[] = []
    if (!headerValues.warehouse_id) errors.push('Warehouse is required')
    const validItems = newItems.filter(n => n.product_variant_id && n.ordered_qty && n.unit_price_foreign !== '')
    if (validItems.length === 0) errors.push('At least one order item is required')
    if (errors.length > 0) { setValidationErrors(errors); return }
    const payload: Record<string, unknown> = { warehouse_id: headerValues.warehouse_id }
    const OPTIONAL = ['currency', 'exchange_rate', 'supplier_id', 'supplier_name', 'forwarder_name',
      'shop_services', 'commission_fee_pct', 'delivery_fee', 'forecast_delivery_date',
      'forecast_cbm', 'forecast_shipping_fee_per_cbm', 'note']
    const NUMERIC = ['exchange_rate', 'commission_fee_pct', 'delivery_fee', 'forecast_cbm', 'forecast_shipping_fee_per_cbm']
    for (const field of OPTIONAL) {
      const val = headerValues[field]
      if (val != null && val !== '') payload[field] = NUMERIC.includes(field) ? Number(val) : val
    }
    payload.order_details = validItems.map(n => ({
      product_variant_id: n.product_variant_id, ordered_qty: Number(n.ordered_qty),
      unit_price_foreign: Number(n.unit_price_foreign),
      ...(hasDiscount && n.discounted_unit_price_foreign ? { discounted_unit_price_foreign: Number(n.discounted_unit_price_foreign) } : {}),
    }))
    try {
      const result = await createMutateAsync(payload)
      toast.success('Purchase order created')
      navigate(`/purchasing/orders/${result.id}`)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const messages = Object.entries(data).map(([f, m]) => `${HEADER_FIELD_LABELS[f] ?? f}: ${Array.isArray(m) ? m.join(', ') : String(m)}`)
        if (messages.length > 0) { setValidationErrors(messages); return }
      }
      toast.error('Failed to create purchase order')
    }
  }

  const handleSave = async () => {
    if (!po) return
    const payload: Record<string, unknown> = { has_discount: hasDiscount }
    for (const [key, value] of Object.entries(headerValues)) {
      if (value !== '' && value !== null && value !== undefined) payload[key] = value
    }
    const canAddDel = po.status === 'DRAFT' || po.status === 'ORDERED'
    if (canAddDel && (deletedDetailIds.size > 0 || newItems.length > 0)) {
      const keptExisting = (po.order_details ?? [])
        .filter(item => !deletedDetailIds.has(item.id))
        .map(item => {
          const changes = { ...(detailValues[item.id] ?? {}) }
          if (!hasDiscount) delete changes.discounted_unit_price_foreign
          return { id: item.id, ...changes }
        })
      const newPayload = newItems
        .filter(n => n.product_variant_id && n.ordered_qty && n.unit_price_foreign)
        .map(n => ({
          product_variant_id: n.product_variant_id, ordered_qty: Number(n.ordered_qty),
          unit_price_foreign: Number(n.unit_price_foreign),
          ...(hasDiscount && n.discounted_unit_price_foreign ? { discounted_unit_price_foreign: Number(n.discounted_unit_price_foreign) } : {}),
        }))
      payload.order_details = [...keptExisting, ...newPayload]
    } else {
      const changed = Object.entries(detailValues).map(([id, c]) => ({ id, ...c })).filter(item => Object.keys(item).length > 1)
      if (changed.length > 0) payload.order_details = changed
    }
    if (Object.keys(payload).length === 0) { cancelEditMode(); return }
    try {
      const result = await updateMutateAsync({ id: po.id, data: payload })
      toast.success('Purchase order updated')
      const compressed = (result as { data?: { compressed_files?: string[] } }).data?.compressed_files
      if (compressed && compressed.length > 0) {
        toast.info(`PDF compressed to reduce size: ${compressed.map((f: string) => HEADER_FIELD_LABELS[f] ?? f).join(', ')}`)
      }
      cancelEditMode()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const messages = Object.entries(data).map(([f, m]) => `${HEADER_FIELD_LABELS[f] ?? f}: ${Array.isArray(m) ? m.join(', ') : String(m)}`)
        if (messages.length > 0) { setValidationErrors(messages); return }
      }
      toast.error('Failed to save')
    }
  }

  return {
    editMode, headerValues, detailValues, deletedDetailIds, newItems, hasDiscount, validationErrors,
    avgWindow, groupBy, collapsedGroups, allGroupKeys, allCollapsed, availableGroupKeys,
    usedVariantIds, activeSupplierId,
    poExchangeRate, freightPerUnit, commissionPerUnit, liveCommissionFee, computedGoodsAmount, deliveryFeeIdr,
    enterEditMode, cancelEditMode, setHeaderField, setDetailField, handleCurrencyChange,
    handleAddItemFromModal, removeNewItem, updateNewItem, deleteExistingItem,
    handleCreate, handleSave, setHasDiscount, setValidationErrors,
    setAvgWindow, setGroupBy, toggleGroupCollapse, setCollapsedGroups, getItemStockData,
  }
}
