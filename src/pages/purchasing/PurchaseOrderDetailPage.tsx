import React, { useState, useEffect, useMemo } from 'react'
 
import { useParams, useNavigate } from 'react-router-dom'
import { usePurchaseOrder, useUpdatePurchaseOrder, useCreatePurchaseOrder, useReplenishment } from '../../hooks/api/usePurchasing'
import { useWarehouses, useSuppliers } from '../../hooks/api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { PurchaseOrderExportModal } from '../../features/purchasing/PurchaseOrderExportModal'
import { StatusAdvanceModal } from '../../components/modals/StatusAdvanceModal'
import { SupplierFormModal } from '../../components/modals/SupplierFormModal'
import { SourcingImportWizard } from '../../features/purchasing/components/SourcingImportWizard'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ArrowLeft, ChevronDown, ExternalLink, FileDown, Pencil, Save, Trash2, Plus, Upload, X as XIcon, ImagePlus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { cn, formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
import type { POStatus, PurchaseOrderDetail, ReplenishmentItem } from '../../types/purchasing'

import { uploadVariantPhoto } from '../../api/inventory'
import type { BadgeProps } from '../../components/ui/badge'

type ModalDraftItem = {
  product_variant_id: string
  product_variant_label: string
  product_id: string
  product_name: string
  product_supplier_link: string | null
  product_photo_url: string | null
  ordered_qty: string
  unit_price_foreign: string
  discounted_unit_price_foreign: string
}

function getCurrencySymbol(currency: string | null | undefined): string {
  const map: Record<string, string> = {
    CNY: '\xA5', RMB: '\xA5', USD: '$', EUR: '\u20AC',
    SGD: 'S$', MYR: 'RM', THB: '\u0E3F', IDR: 'Rp',
  }
  return map[(currency ?? '').toUpperCase()] ?? (currency ?? '')
}

function formatForeignAmount(val: string | number | null | undefined): string {
  if (val == null || val === '') return '\u2014'
  return Number(val).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDecimalUnit(val: string | number | null | undefined, unit?: string): string {
  if (val == null || val === '') return '\u2014'
  const formatted = Number(val).toLocaleString('id-ID', { maximumFractionDigits: 3 })
  return unit ? `${formatted} ${unit}` : formatted
}

function doiAfterColor(days: number | null): string {
  if (days === null) return 'text-muted-foreground'
  if (days < 30) return 'text-red-600'
  if (days < 80) return 'text-amber-600'
  if (days <= 120) return 'text-green-600'
  return 'text-red-600'
}

const statusVariant: Record<POStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary', ORDERED: 'info', SHIPPED: 'warning',
  DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'destructive',
}

type FieldInputConfig = {
  label: string
  inputType: 'text' | 'number' | 'date' | 'file' | 'select'
  step?: string
  suffix?: string
  options?: { value: string; label: string }[]
}

const HEADER_FIELD_CONFIG: Record<string, FieldInputConfig> = {
  supplier_name:               { label: 'Supplier',            inputType: 'text' },
  forwarder_name:              { label: 'Forwarder',           inputType: 'text' },
  shop_services:               { label: 'Jasa Belanja',        inputType: 'text' },
  currency:                    { label: 'Currency',            inputType: 'select', options: [
    { value: 'CNY', label: 'CNY (¥ Yuan)' },
    { value: 'USD', label: 'USD ($ Dollar)' },
    { value: 'EUR', label: 'EUR (€ Euro)' },
    { value: 'SGD', label: 'SGD (S$ Singapore)' },
    { value: 'MYR', label: 'MYR (RM Ringgit)' },
    { value: 'IDR', label: 'IDR (Rp Rupiah)' },
  ] },
  exchange_rate:               { label: 'Exchange Rate',       inputType: 'number', step: '0.001' },
  commission_fee_pct:          { label: 'Commission %',        inputType: 'number' },
  forecast_shipping_fee_per_cbm: { label: 'Forecast Shipping/CBM', inputType: 'number' },
  delivery_fee:               { label: 'Delivery Fee (RMB)',  inputType: 'number', step: '0.001' },
  commission_fee_rmb:          { label: 'Commission (RMB)',    inputType: 'number', step: '0.001' },
  invoice_number:              { label: 'Invoice No.',         inputType: 'text' },
  invoice_date:                { label: 'Invoice Date',        inputType: 'date' },
  delivery_order_number:       { label: 'Delivery Order No.', inputType: 'text' },
  delivery_date:               { label: 'Delivery Date',      inputType: 'date' },
  forecast_delivery_date:      { label: 'Forecast Delivery',  inputType: 'date' },
  cbm:                         { label: 'CBM',                inputType: 'number', step: '0.001' },
  forecast_cbm:                { label: 'Forecast CBM',       inputType: 'number', step: '0.001' },
  weight:                      { label: 'Weight (kg)',        inputType: 'number', step: '0.01' },
  shipping_fee_per_cbm:        { label: 'Shipping Fee/CBM',  inputType: 'number' },
  forecast_shipping_fee:       { label: 'Forecast Shipping', inputType: 'number' },
  purchase_order_invoice_file: { label: 'PO Invoice File',   inputType: 'file' },
  delivery_order_file:         { label: 'DO File',           inputType: 'file' },
  delivery_order_invoice_file: { label: 'DO Invoice File',   inputType: 'file' },
  packing_list_file:           { label: 'Packing List',      inputType: 'file' },
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isCreating = id === 'new'
  const { data: po, isLoading } = usePurchaseOrder(isCreating ? '' : id!)
  const { user } = useAuth()
  const createMutation = useCreatePurchaseOrder()
  const { data: warehouseData } = useWarehouses()
  const warehouses = warehouseData?.results ?? []
  const { data: suppliersData } = useSuppliers({ active_only: 'true' })
  const suppliers = suppliersData?.results ?? []
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [variantPhotoOverrides, setVariantPhotoOverrides] = useState<Record<string, string>>({})
  const [uploadingVariantPhoto, setUploadingVariantPhoto] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [editMode, setEditMode] = useState(isCreating)
  const [headerValues, setHeaderValues] = useState<Record<string, string | File>>({})
  const [detailValues, setDetailValues] = useState<Record<string, Record<string, string>>>({})
  const [deletedDetailIds, setDeletedDetailIds] = useState<Set<string>>(new Set())
  const [newItems, setNewItems] = useState<Array<{
    _tempId: string
    product_variant_id: string
    product_variant_label: string
    product_id: string
    product_name: string
    product_supplier_link: string | null
    product_photo_url: string | null
    ordered_qty: string
    unit_price_foreign: string
    discounted_unit_price_foreign: string
  }>>([])
  const activeSupplierId: string | undefined =
    (po?.supplier_id as string | undefined) ??
    (headerValues.supplier_id ? String(headerValues.supplier_id) : undefined) ??
    undefined
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)

  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)
  const updateMutation = useUpdatePurchaseOrder()
  const [hasDiscount, setHasDiscount] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const toggleGroupCollapse = (key: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const [showImportWizard, setShowImportWizard] = useState(false)

  const handleVariantPhotoUpload = async (variantId: string, productId: string, file: File) => {
    setUploadingVariantPhoto(prev => ({ ...prev, [variantId]: true }))
    try {
      const r = await uploadVariantPhoto(productId, variantId, file)
      setVariantPhotoOverrides(prev => ({ ...prev, [variantId]: r.data.photo_url }))
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploadingVariantPhoto(prev => ({ ...prev, [variantId]: false }))
    }
  }

  const [avgWindow, setAvgWindow] = useState<7 | 14 | 30>(30)
  const { data: replenishData } = useReplenishment()
  const stockMap = useMemo<Map<string, ReplenishmentItem>>(() => {
    const m = new Map<string, ReplenishmentItem>()
    for (const item of replenishData?.results ?? []) m.set(item.variant_id, item)
    return m
  }, [replenishData])

  const [groupBy, setGroupBy] = useState<string>('product')

  const availableGroupKeys = useMemo<string[]>(() => {
    const keySet = new Set<string>()
    for (const item of (po?.order_details ?? [])) {
      for (const key of Object.keys(item.variant_values ?? {})) {
        keySet.add(key)
      }
    }
    return Array.from(keySet)
  }, [po?.order_details])

  const usedVariantIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>()
    for (const item of (po?.order_details ?? [])) {
      if (!deletedDetailIds.has(item.id)) ids.add(item.variant_id)
    }
    for (const n of newItems) {
      if (n.product_variant_id) ids.add(n.product_variant_id)
    }
    return ids
  }, [po?.order_details, deletedDetailIds, newItems])

  useEffect(() => {
    if (!po) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGroupBy('product')
    setHasDiscount(po.has_discount ?? false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- po is compared by id
  }, [po?.id])



  const allGroupKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const item of (po?.order_details ?? []).filter(i => !deletedDetailIds.has(i.id))) {
      if (groupBy === 'product') {
        keys.add(item.product_id || 'unknown')
      } else if (groupBy === 'flat') {
        keys.add(item.id)
      } else {
        const dimValue = item.variant_values?.[groupBy] ?? 'Other'
        keys.add(`${item.product_id}_${dimValue}`)
      }
    }
    const canAddDelItems = isCreating || (po?.status ?? '') === 'DRAFT' || (po?.status ?? '') === 'ORDERED'
    if (editMode && canAddDelItems) {
      for (const n of newItems) {
        keys.add(n.product_id || `new-${n._tempId}`)
      }
    }
    return [...keys]
  }, [po?.order_details, groupBy, deletedDetailIds, editMode, isCreating, po?.status, newItems])

  const allCollapsed = allGroupKeys.length > 0 &&
    allGroupKeys.every(k => collapsedGroups.has(k))

  if (!isCreating && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!isCreating && !po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found</div>

  const canAddDeleteItems = isCreating || po?.status === 'DRAFT' || po?.status === 'ORDERED'

  const deliveryFeeIdr = isCreating ? 0 : Math.round(
    Number(po?.delivery_fee ?? 0) * Number(po?.exchange_rate ?? 0)
  )

  const attachments = isCreating ? [] : [
    { label: 'PO Invoice',     field: 'purchase_order_invoice_file',  url: po!.purchase_order_invoice_file },
    { label: 'Delivery Order', field: 'delivery_order_file',           url: po!.delivery_order_file },
    { label: 'DO Invoice',     field: 'delivery_order_invoice_file',   url: po!.delivery_order_invoice_file },
    { label: 'Packing List',   field: 'packing_list_file',             url: po!.packing_list_file },
  ]

  const enterEditMode = () => {
    if (isCreating || !po) return
    const initial: Record<string, string | File> = {}
    for (const field of po!.editable_fields.header) {
      if (field === 'note') {
        initial[field] = po!.note ?? ''
        continue
      }
      if (['purchase_order_invoice_file', 'delivery_order_file', 'delivery_order_invoice_file', 'packing_list_file'].includes(field)) {
        continue
      }
      const val = (po as unknown as Record<string, unknown>)[field]
      if (val != null && val !== '') initial[field] = String(val)
    }
    const initDetails: Record<string, Record<string, string>> = {}
    for (const item of po!.order_details ?? []) {
      const row: Record<string, string> = {}
      for (const field of po!.editable_fields.order_detail) {
        const val = (item as unknown as Record<string, unknown>)[field]
        if (val != null) row[field] = String(val)
      }
      if (Object.keys(row).length > 0) initDetails[item.id] = row
    }
    setHeaderValues(initial)
    setDetailValues(initDetails)
    setEditMode(true)
    setDeletedDetailIds(new Set())
    setNewItems([])
  }

  const cancelEditMode = () => {
    setEditMode(false)
    setHeaderValues({})
    setDetailValues({})
    setDeletedDetailIds(new Set())
    setNewItems([])
  }

  const setHeaderField = (field: string, value: string | File) =>
    setHeaderValues(prev => ({ ...prev, [field]: value }))

  const setDetailField = (itemId: string, field: string, value: string) =>
    setDetailValues(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [field]: value }
    }))

  const handleCurrencyChange = (field: string, val: string | File) => {
    setHeaderField(field, val)
    if (field !== 'currency' || typeof val !== 'string') return
    const newCurrency = val
    let filledCount = 0
    let existingPricedCount = 0
    for (const item of po?.order_details ?? []) {
      if (deletedDetailIds.has(item.id)) continue
      const currentPrice = detailValues[item.id]?.unit_price_foreign ?? item.unit_price_foreign
      const isEmpty = !currentPrice || Number(currentPrice) === 0
      if (!isEmpty) {
        existingPricedCount++
      }
      if (isEmpty && item.last_currency === newCurrency && item.last_unit_price_foreign) {
        setDetailField(item.id, 'unit_price_foreign', item.last_unit_price_foreign)
        if (po?.has_discount && item.last_discounted_unit_price_foreign) {
          const currentDiscounted =
            detailValues[item.id]?.discounted_unit_price_foreign ??
            item.discounted_unit_price_foreign
          const isDiscountedEmpty = !currentDiscounted || Number(currentDiscounted) === 0
          if (isDiscountedEmpty) {
            setDetailField(item.id, 'discounted_unit_price_foreign', item.last_discounted_unit_price_foreign)
          }
        }
        filledCount++
      }
    }
    if (filledCount > 0) {
      toast.info('Unit prices auto-filled from last purchase price')
    }
    if (existingPricedCount > 0) {
      toast.warning('Currency changed — existing prices may be in the old currency')
    }
  }

  const removeNewItem = (_tempId: string) =>
    setNewItems(prev => prev.filter(n => n._tempId !== _tempId))

  const updateNewItem = (_tempId: string, field: string, value: string) =>
    setNewItems(prev => prev.map(n => n._tempId === _tempId ? { ...n, [field]: value } : n))

  const handleAddItemFromModal = (items: ModalDraftItem[]) => {
    const timestamp = Date.now()
    setNewItems(prev => [
      ...prev,
      ...items.map((item, i) => ({
        ...item,
        _tempId: `new-${timestamp}-${prev.length + i}`,
      })),
    ])
  }

  const deleteExistingItem = (itemId: string) =>
    setDeletedDetailIds(prev => new Set([...prev, itemId]))

  const handleCreate = async () => {
    const errors: string[] = []
    if (!headerValues.warehouse_id) errors.push('Warehouse is required')
    const validItems = newItems.filter(n => n.product_variant_id && n.ordered_qty && n.unit_price_foreign !== '')
    if (validItems.length === 0) errors.push('At least one order item is required')
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    const payload: Record<string, unknown> = { warehouse_id: headerValues.warehouse_id }
    const optionalFields = ['currency', 'exchange_rate', 'supplier_id', 'supplier_name', 'forwarder_name',
      'shop_services', 'commission_fee_pct', 'delivery_fee', 'forecast_delivery_date',
      'forecast_cbm', 'forecast_shipping_fee_per_cbm', 'note']
    const numericFields = ['exchange_rate', 'commission_fee_pct', 'delivery_fee', 'forecast_cbm', 'forecast_shipping_fee_per_cbm']
    for (const field of optionalFields) {
      const val = headerValues[field]
      if (val != null && val !== '') payload[field] = numericFields.includes(field) ? Number(val) : val
    }
    payload.order_details = [
      ...validItems.map(n => ({
        product_variant_id: n.product_variant_id,
        ordered_qty: Number(n.ordered_qty),
        unit_price_foreign: Number(n.unit_price_foreign),
        ...(hasDiscount && n.discounted_unit_price_foreign
          ? { discounted_unit_price_foreign: Number(n.discounted_unit_price_foreign) }
          : {}),
      })),
    ]
    try {
      const result = await createMutation.mutateAsync(payload)
      toast.success('Purchase order created')
      navigate(`/purchasing/orders/${result.id}`)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const messages: string[] = []
        for (const [field, msg] of Object.entries(data)) {
          const label = HEADER_FIELD_CONFIG[field]?.label ?? field
          const text = Array.isArray(msg) ? msg.join(', ') : String(msg)
          messages.push(`${label}: ${text}`)
        }
        if (messages.length > 0) {
          setValidationErrors(messages)
          return
        }
      }
      toast.error('Failed to create purchase order')
    }
  }

  const handleSave = async () => {
    const payload: Record<string, unknown> = {}
    payload.has_discount = hasDiscount
    for (const [key, value] of Object.entries(headerValues)) {
      if (value !== '' && value !== null && value !== undefined) payload[key] = value
    }
    const canAddDel = po!.status === 'DRAFT' || po!.status === 'ORDERED'
    if (canAddDel && (deletedDetailIds.size > 0 || newItems.length > 0)) {
      const keptExisting = (po!.order_details ?? [])
        .filter(item => !deletedDetailIds.has(item.id))
        .map(item => {
          const changes = { ...(detailValues[item.id] ?? {}) }
          if (!hasDiscount) delete changes.discounted_unit_price_foreign
          return { id: item.id, ...changes }
        })
      const newItemsPayload = newItems
        .filter(n => n.product_variant_id && n.ordered_qty && n.unit_price_foreign)
        .map(n => ({
          product_variant_id: n.product_variant_id,
          ordered_qty: Number(n.ordered_qty),
          unit_price_foreign: Number(n.unit_price_foreign),
          ...(hasDiscount && n.discounted_unit_price_foreign
            ? { discounted_unit_price_foreign: Number(n.discounted_unit_price_foreign) }
            : {}),
        }))
      payload.order_details = [...keptExisting, ...newItemsPayload]
    } else {
      const changedDetails = Object.entries(detailValues)
        .map(([itemId, changes]) => ({ id: itemId, ...changes }))
        .filter(item => Object.keys(item).length > 1)
      if (changedDetails.length > 0) payload.order_details = changedDetails
    }
    if (Object.keys(payload).length === 0) { cancelEditMode(); return }
    try {
      const result = await updateMutation.mutateAsync({ id: po!.id, data: payload })
      toast.success('Purchase order updated')
      const compressedFiles = (result as { data?: { compressed_files?: string[] } }).data?.compressed_files
      if (compressedFiles && compressedFiles.length > 0) {
        const labels = compressedFiles.map(
          (f: string) => HEADER_FIELD_CONFIG[f]?.label ?? f
        )
        toast.info(`PDF compressed to reduce size: ${labels.join(', ')}`)
      }
      cancelEditMode()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
      if (data && typeof data === 'object') {
        const messages: string[] = []
        for (const [field, msg] of Object.entries(data)) {
          const label = HEADER_FIELD_CONFIG[field]?.label ?? field
          const text = Array.isArray(msg) ? msg.join(', ') : String(msg)
          messages.push(`${label}: ${text}`)
        }
        if (messages.length > 0) {
          setValidationErrors(messages)
          return
        }
      }
      toast.error('Failed to save')
    }
  }

  const computedGoodsAmount = isCreating
    ? 0
    : (po?.order_details ?? []).reduce((s, i) => {
        if (hasDiscount) return s + (i.discounted_total_price_base ?? i.total_price_base ?? 0)
        return s + (i.total_price_base ?? i.discounted_total_price_base ?? 0)
      }, 0)

  const getItemStockData = (item: PurchaseOrderDetail) => {
    const hasSnapshot = item.avg_sales !== null
    const liveStats = !hasSnapshot ? stockMap.get(item.variant_id) : undefined
    const soh = hasSnapshot ? item.stock_on_hand : (liveStats?.stock_on_hand ?? 0)
    const incoming = hasSnapshot ? item.incoming_qty : (liveStats?.incoming_qty ?? 0)
    const rawAvg = hasSnapshot
      ? (avgWindow === 7 ? Number(item.avg_sales_7d ?? 0) : Number(item.avg_sales ?? 0))
      : (avgWindow === 7 ? (liveStats?.avg_sales_7d ?? 0) : avgWindow === 14 ? (liveStats?.avg_sales_14d ?? 0) : (liveStats?.avg_sales_30d ?? 0))
    const hasData = hasSnapshot || liveStats !== undefined
    const avg = rawAvg > 0 ? rawAvg : (hasData ? 1 / avgWindow : 0)
    const upcoming = soh + incoming + item.ordered_qty
    const doi = avg > 0 ? Math.round((soh + incoming) / avg) : null
    const doiAfter = avg > 0 ? Math.round(upcoming / avg) : null
    const recommendedQty = avg > 0 ? Math.max(0, Math.ceil(avg * 90 - soh - incoming)) : null
    return { soh, incoming, upcoming, avg, doi, doiAfter, hasSnapshot, recommendedQty }
  }

  const poExchangeRate = isCreating
    ? Number(headerValues.exchange_rate || 0)
    : Number(po?.exchange_rate ?? 0)
  const effectiveShipping = isCreating ? 0 : (po?.shipping_fee || po?.forecast_shipping_fee || 0)
  const freightPerUnit = isCreating ? 0 : (po!.total_ordered_qty > 0
    ? Math.round(effectiveShipping / po!.total_ordered_qty)
    : 0)
  // null (not 0) when pct absent — lets display fall back to stored po.commission_fee
  const livePct = editMode
    ? (headerValues.commission_fee_pct != null ? Number(headerValues.commission_fee_pct) : (po?.commission_fee_pct != null ? Number(po.commission_fee_pct) : null))
    : (po?.commission_fee_pct != null ? Number(po.commission_fee_pct) : null)

  const liveCommissionFee = !isCreating && po != null && livePct != null
    ? Math.round(
        (po.order_details ?? []).reduce(
          (s, i) => s + Number(
            hasDiscount
              ? (i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0)
              : (i.total_price_foreign ?? i.discounted_total_price_foreign ?? 0)
          ),
          0
        ) *
        (livePct / 100) *
        (editMode
          ? (Number(headerValues.exchange_rate) || Number(po.exchange_rate) || 0)
          : Number(po.exchange_rate || 0)
        )
      )
    : null

  const commissionPerUnit = isCreating ? 0 : (po!.total_ordered_qty > 0
    ? Math.round((liveCommissionFee ?? po!.commission_fee ?? 0) / po!.total_ordered_qty)
    : 0)

  const orderItemsContent = (() => {
    const visibleDetails = isCreating
      ? []
      : (po?.order_details ?? []).filter(item => !deletedDetailIds.has(item.id))

    type DisplayGroup = {
      groupKey: string
      productName: string
      productSupplierLink: string | null
      productPhotoUrl: string | null
      existingItems: PurchaseOrderDetail[]
      newItemsList: typeof newItems
    }

    const groupMap = new Map<string, DisplayGroup>()

    for (const item of visibleDetails) {
      let key: string
      let groupLabel: string
      let groupPhoto: string | null

      if (groupBy === 'product') {
        key = item.product_id || 'unknown'
        groupLabel = item.product_name || 'Unknown Product'
        groupPhoto = item.product_photo_url ?? null
      } else if (groupBy === 'flat') {
        key = item.id
        groupLabel = item.product_variant_name || item.product_name || ''
        groupPhoto = null
      } else {
        const dimValue = item.variant_values?.[groupBy] ?? 'Other'
        key = `${item.product_id}_${dimValue}`
        groupLabel = `${item.product_name} ${dimValue}`
        groupPhoto = item.product_photo_url ?? null
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          groupKey: key,
          productName: groupLabel,
          productSupplierLink: item.product_supplier_link,
          productPhotoUrl: groupPhoto,
          existingItems: [],
          newItemsList: [],
        })
      }
      groupMap.get(key)!.existingItems.push(item)
    }

    if (editMode && canAddDeleteItems) {
      for (const n of newItems) {
        const key = n.product_id || `new-${n._tempId}`
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            groupKey: key,
            productName: n.product_name || 'Unknown Product',
            productSupplierLink: n.product_supplier_link,
            productPhotoUrl: n.product_photo_url ?? null,
            existingItems: [],
            newItemsList: [],
          })
        }
        groupMap.get(key)!.newItemsList.push(n)
      }
    }

    for (const group of groupMap.values()) {
      group.existingItems.sort((a, b) => {
        const aKeys = Object.keys(a.variant_values ?? {})
        const dim1Key = aKeys[0] ?? ''
        const dim2Key = aKeys[1] ?? ''
        const cmp2 = String(a.variant_values?.[dim2Key] ?? '').localeCompare(String(b.variant_values?.[dim2Key] ?? ''))
        if (cmp2 !== 0) return cmp2
        return String(a.variant_values?.[dim1Key] ?? '').localeCompare(String(b.variant_values?.[dim1Key] ?? ''))
      })
    }

    return Array.from(groupMap.values()).map(group => {
    const showRemarks = !isCreating && editMode && (po?.editable_fields.order_detail.includes('remarks') ?? false)

    const groupStockData = group.existingItems.map(item => getItemStockData(item))
    const sumSOH = groupStockData.reduce((s, d) => s + d.soh, 0)
    const sumIncoming = groupStockData.reduce((s, d) => s + d.incoming, 0)
    const sumUpcoming = groupStockData.reduce((s, d) => s + d.upcoming, 0)
    const sumAvg = groupStockData.reduce((s, d) => s + d.avg, 0)
    const groupDoi = sumAvg > 0 ? Math.round((sumSOH + sumIncoming) / sumAvg) : null
    const groupDoiAfter = sumAvg > 0 ? Math.round(sumUpcoming / sumAvg) : null
    const sumRecommended = groupStockData.reduce((s, d) => s + (d.recommendedQty ?? 0), 0)
    const hasAnyRec = groupStockData.some(d => d.recommendedQty !== null)
    const sumOrdered = group.existingItems.reduce((s, i) => s + i.ordered_qty, 0) +
      group.newItemsList.reduce((s, n) => s + Number(n.ordered_qty || 0), 0)
    const sumReceived = group.existingItems.reduce((s, i) => s + (i.received_qty ?? 0), 0)
    const sumTotalForeign = group.existingItems.reduce((s, i) => {
      const unitF = hasDiscount
        ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
        : Number(i.unit_price_foreign ?? 0)
      return s + unitF * i.ordered_qty
    }, 0)
    const sumTotalIdr = group.existingItems.reduce((s, i) => {
      const base = hasDiscount
        ? (i.discounted_total_price_base ?? i.total_price_base ?? 0)
        : (i.total_price_base ?? i.discounted_total_price_base ?? 0)
      return s + base
    }, 0)

    const maxUnitForeign = group.existingItems.length > 0
      ? Math.max(...group.existingItems.map(i =>
          hasDiscount
            ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
            : Number(i.unit_price_foreign ?? 0)))
      : 0
    const maxUnitIdr = Math.round(maxUnitForeign * poExchangeRate)
    const maxCogsPerUnit = group.existingItems.length > 0
      ? Math.max(...group.existingItems.map(i => {
          if (i.cogs_per_unit_idr != null) return i.cogs_per_unit_idr
          const unitF = hasDiscount
            ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0)
            : Number(i.unit_price_foreign ?? 0)
          return Math.round(unitF * poExchangeRate) + freightPerUnit + commissionPerUnit
        }))
      : 0

    return (
      <tbody key={group.groupKey}>
        <tr
          className="bg-muted/40 border-b cursor-pointer hover:bg-muted/60 transition-colors font-semibold text-sm"
          onClick={() => toggleGroupCollapse(group.groupKey)}
        >
          <td colSpan={2} className="px-3 py-2 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', collapsedGroups.has(group.groupKey) && '-rotate-90')} />
              {group.productPhotoUrl ? (
                <img src={group.productPhotoUrl} alt={group.productName}
                  className="h-6 w-6 rounded object-cover shrink-0 border border-border" />
              ) : (
                <div className="h-6 w-6 rounded bg-muted shrink-0" />
              )}
              <span className="font-bold text-foreground">{group.productName}</span>
              {group.productSupplierLink && (
                <a href={group.productSupplierLink} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 text-xs shrink-0">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </td>
          <td className="px-3 py-2 whitespace-nowrap font-medium text-violet-600">
            {hasAnyRec ? sumRecommended : '\u2014'}
          </td>
          <td className="px-3 py-2 whitespace-nowrap">{sumOrdered}</td>
          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{sumReceived || '\u2014'}</td>
          <td className="px-3 py-2 whitespace-nowrap">{sumSOH}</td>
          <td className="px-3 py-2 whitespace-nowrap text-blue-600">{sumIncoming}</td>
          <td className="px-3 py-2 whitespace-nowrap">{sumUpcoming}</td>
          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">
            {sumAvg > 0 ? `${sumAvg.toFixed(1)}/d` : '—'}
          </td>
          <td className={`px-3 py-2 whitespace-nowrap ${groupDoi !== null && groupDoi < 14 ? 'text-red-600' : groupDoi !== null && groupDoi <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {groupDoi !== null ? `${groupDoi}d` : '—'}
          </td>
          <td className={`px-3 py-2 whitespace-nowrap ${doiAfterColor(groupDoiAfter)}`}>
            {groupDoiAfter !== null ? `${groupDoiAfter}d` : '—'}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">
            {maxUnitForeign > 0
              ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(maxUnitForeign)}`
              : '—'}
          </td>
          {hasDiscount && <td className="px-3 py-2" />}
          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">
            {maxUnitIdr > 0 ? formatIDR(maxUnitIdr) : '—'}
          </td>
          <td className="px-3 py-2 whitespace-nowrap">
            {sumTotalForeign > 0 ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(sumTotalForeign)}` : '—'}
          </td>
          <td className="px-3 py-2 whitespace-nowrap">{sumTotalIdr > 0 ? formatIDR(sumTotalIdr) : '—'}</td>
          <td className="px-3 py-2 whitespace-nowrap font-medium text-amber-700">
            {maxCogsPerUnit > 0 ? formatIDR(maxCogsPerUnit) : '—'}
          </td>
          <td className="px-3 py-2" />
          {editMode && canAddDeleteItems && <td />}
        </tr>
        {!collapsedGroups.has(group.groupKey) && (
        <>
        {group.existingItems.map(item => {
          const rowChanges = detailValues[item.id] ?? {}
          const isDetailEditable = (field: string) =>
            editMode && (isCreating || (po?.editable_fields.order_detail.includes(field) ?? false))
          const { soh, incoming, upcoming, avg, doi, doiAfter, hasSnapshot, recommendedQty } = getItemStockData(item)

          const effectiveUnitForeign = hasDiscount
            ? Number(rowChanges.discounted_unit_price_foreign ?? item.discounted_unit_price_foreign ?? item.unit_price_foreign ?? 0)
            : Number(rowChanges.unit_price_foreign ?? item.unit_price_foreign ?? 0)
          const effectiveQty = Number(rowChanges.ordered_qty ?? item.ordered_qty ?? 0)
          const unitPriceIdr = Math.round(effectiveUnitForeign * poExchangeRate)
          const totalForeign = effectiveUnitForeign * effectiveQty
          const totalIdr = unitPriceIdr * effectiveQty
          const cogsPerUnit = unitPriceIdr + freightPerUnit + commissionPerUnit

          return (
            <React.Fragment key={item.id}>
              <tr className="border-b last:border-b-0 hover:bg-muted/10 transition-colors">
                <td colSpan={2} className="pl-4 pr-3 py-1.5 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <label className={`relative w-7 h-7 rounded border overflow-hidden shrink-0 cursor-pointer
                      ${uploadingVariantPhoto[item.variant_id] ? 'opacity-50' : 'hover:opacity-80'}`}>
                      {variantPhotoOverrides[item.variant_id] || item.product_photo_url ? (
                        <img
                          src={variantPhotoOverrides[item.variant_id] ?? item.product_photo_url ?? ''}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                          <ImagePlus className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingVariantPhoto[item.variant_id]}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleVariantPhotoUpload(item.variant_id, item.product_id, file)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    <div className="flex flex-col min-w-0"><span className="font-mono font-medium">{item.product_variant_name}</span>{item.sku_variant_code && (<span className="text-[10px] text-muted-foreground font-mono leading-tight">{item.sku_variant_code}</span>)}</div>
                  </div>
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap font-medium text-violet-600">
                  {recommendedQty !== null ? recommendedQty : '\u221E'}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {isDetailEditable('ordered_qty') ? (
                    <Input type="number" className="h-7 w-14 text-xs"
                      value={rowChanges.ordered_qty ?? String(item.ordered_qty)}
                      onChange={e => setDetailField(item.id, 'ordered_qty', e.target.value)} />
                  ) : item.ordered_qty}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {isDetailEditable('received_qty') ? (
                    <Input type="number" className="h-7 w-14 text-xs"
                      value={rowChanges.received_qty ?? String(item.received_qty ?? '')}
                      onChange={e => setDetailField(item.id, 'received_qty', e.target.value)} />
                  ) : (item.received_qty ?? '—')}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{soh}</td>
                <td className="px-3 py-1.5 whitespace-nowrap text-blue-600">{incoming}</td>
                <td className="px-3 py-1.5 whitespace-nowrap font-medium">{upcoming}</td>
                <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                  {avg > 0 ? `${avg.toFixed(1)}/d` : '—'}
                  {hasSnapshot && <span className="text-[10px] text-muted-foreground/50 ml-0.5">*</span>}
                </td>
                <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doi !== null && doi < 14 ? 'text-red-600' : doi !== null && doi <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {doi !== null ? `${doi}d` : '\u221E'}
                </td>
                <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doiAfterColor(doiAfter)}`}>
                  {doiAfter !== null ? `${doiAfter}d` : '\u221E'}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">
                  {isDetailEditable('unit_price_foreign') ? (
                    <Input type="number" step="0.001" className="h-7 w-20 text-xs"
                      value={rowChanges.unit_price_foreign ?? String(item.unit_price_foreign ?? '')}
                      onChange={e => {
                        setDetailField(item.id, 'unit_price_foreign', e.target.value)
                        if (hasDiscount) setDetailField(item.id, 'discounted_unit_price_foreign', e.target.value)
                      }} />
                  ) : (item.unit_price_foreign != null ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(item.unit_price_foreign)}` : '—')}
                </td>
                {hasDiscount && (
                  <td className="px-3 py-1.5 whitespace-nowrap">
                    {isDetailEditable('discounted_unit_price_foreign') ? (
                      <Input type="number" step="0.001" className="h-7 w-20 text-xs"
                        value={rowChanges.discounted_unit_price_foreign ?? String(item.discounted_unit_price_foreign ?? '')}
                        onChange={e => setDetailField(item.id, 'discounted_unit_price_foreign', e.target.value)} />
                    ) : (item.discounted_unit_price_foreign != null ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(item.discounted_unit_price_foreign)}` : '—')}
                  </td>
                )}
                <td className="px-3 py-1.5 whitespace-nowrap">{unitPriceIdr > 0 ? formatIDR(unitPriceIdr) : '—'}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{totalForeign > 0 ? `${getCurrencySymbol(po?.currency)} ${formatForeignAmount(totalForeign)}` : '—'}</td>
                <td className="px-3 py-1.5 whitespace-nowrap font-medium">{totalIdr > 0 ? formatIDR(totalIdr) : '—'}</td>
                <td className="px-3 py-1.5 whitespace-nowrap font-medium text-amber-700">{item.cogs_per_unit_idr != null ? formatIDR(item.cogs_per_unit_idr) : (cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—')}</td>
                <td className="px-3 py-1.5">
                  {showRemarks ? (
                    <Input className="h-7 text-xs min-w-[80px]" placeholder="Remarks..."
                      value={rowChanges.remarks ?? String(item.remarks ?? '')}
                      onChange={e => setDetailField(item.id, 'remarks', e.target.value)} />
                  ) : <span className="text-muted-foreground">{item.remarks || ''}</span>}
                </td>
                {editMode && canAddDeleteItems && (
                  <td className="px-2 py-1 w-8">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => deleteExistingItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                )}
              </tr>

            </React.Fragment>
          )
        })}
        {editMode && canAddDeleteItems && group.newItemsList.map(n => {
          const liveStats = n.product_variant_id ? stockMap.get(n.product_variant_id) : undefined
          const ordQty = Number(n.ordered_qty) || 0
          const liveSoh = liveStats?.stock_on_hand ?? 0
          const liveIncoming = liveStats?.incoming_qty ?? 0
          const liveUpcoming = liveStats ? liveSoh + liveIncoming + ordQty : null
          const rawAvgLive = liveStats ? (avgWindow === 7 ? liveStats.avg_sales_7d : avgWindow === 14 ? liveStats.avg_sales_14d : liveStats.avg_sales_30d) : 0
          const avg = rawAvgLive > 0 ? rawAvgLive : (liveStats ? 1 / avgWindow : 0)
          const doi = liveStats && avg > 0 ? Math.round((liveSoh + liveIncoming) / avg) : null
          const doiAfter = liveStats && avg > 0 && ordQty > 0 ? Math.round((liveSoh + liveIncoming + ordQty) / avg) : null
          const liveRec = liveStats && avg > 0
            ? Math.max(0, Math.ceil(avg * 90 - liveSoh - liveIncoming))
            : null
          const unitForeign = Number(n.unit_price_foreign) || 0
          const unitIdr = Math.round(unitForeign * poExchangeRate)
          const cogsPerUnit = unitIdr + freightPerUnit + commissionPerUnit

          return (
            <tr key={n._tempId} className="border-b last:border-b-0">
              <td colSpan={2} className="px-2 py-1 min-w-[160px]">
                <VariantSearchSelect
                  value={n.product_variant_id}
                  selectedLabel={n.product_variant_label}
                  supplierId={activeSupplierId}
                  onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, _lastCurrency, lastDiscountedUnitPriceForeign) => {
                    updateNewItem(n._tempId, 'product_variant_id', id)
                    updateNewItem(n._tempId, 'product_variant_label', label)
                    updateNewItem(n._tempId, 'product_id', productId)
                    updateNewItem(n._tempId, 'product_name', productName)
                    updateNewItem(n._tempId, 'product_supplier_link', productSupplierLink ?? '')
                    updateNewItem(n._tempId, 'product_photo_url', productPhotoUrl ?? '')
                    if (lastUnitPriceForeign && parseFloat(lastUnitPriceForeign) > 0) {
                      updateNewItem(n._tempId, 'unit_price_foreign', lastUnitPriceForeign)
                    }
                    if (hasDiscount && lastDiscountedUnitPriceForeign && parseFloat(lastDiscountedUnitPriceForeign) > 0) {
                      updateNewItem(n._tempId, 'discounted_unit_price_foreign', lastDiscountedUnitPriceForeign)
                    }
                  }}
                  placeholder="Select variant"
                />
              </td>
              <td className="px-3 py-1.5 whitespace-nowrap font-medium text-violet-600">
                {liveRec !== null ? liveRec : (liveStats ? '\u221E' : '\u2014')}
              </td>
              <td className="px-2 py-1">
                <Input type="number" className="h-7 w-14 text-xs"
                  value={n.ordered_qty}
                  onChange={e => updateNewItem(n._tempId, 'ordered_qty', e.target.value)} />
              </td>
              <td className="px-2 py-1" />
              <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{liveStats ? liveSoh : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap text-blue-600">{liveStats ? liveIncoming : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap font-medium">{liveUpcoming !== null ? liveUpcoming : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                {liveStats && avg > 0 ? `${avg.toFixed(1)}/d` : '—'}
              </td>
              <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doi !== null && doi < 14 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {doi !== null ? `${doi}d` : (liveStats ? '\u221E' : '—')}
              </td>
              <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doiAfterColor(doiAfter)}`}>
                {doiAfter !== null ? `${doiAfter}d` : (liveStats && ordQty > 0 ? '\u221E' : '—')}
              </td>
              <td className="px-2 py-1">
                <Input type="number" step="0.001" className="h-7 w-20 text-xs"
                  value={n.unit_price_foreign}
                  onChange={e => {
                    updateNewItem(n._tempId, 'unit_price_foreign', e.target.value)
                    if (hasDiscount) updateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value)
                  }} />
              </td>
              {hasDiscount && (
                <td className="px-2 py-1">
                  <Input type="number" step="0.001" className="h-7 w-20 text-xs"
                    value={n.discounted_unit_price_foreign}
                    onChange={e => updateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value)} />
                </td>
              )}
              <td className="px-3 py-1.5 whitespace-nowrap">{unitIdr > 0 ? formatIDR(unitIdr) : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">{unitForeign * ordQty > 0 ? `${getCurrencySymbol(po?.currency ?? String(headerValues.currency))} ${formatForeignAmount(unitForeign * ordQty)}` : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap font-medium">{unitIdr * ordQty > 0 ? formatIDR(unitIdr * ordQty) : '—'}</td>
              <td className="px-3 py-1.5 whitespace-nowrap font-medium text-amber-700">{cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—'}</td>
              <td className="px-3 py-1.5" />
              <td className="px-2 py-1 w-8">
                <Button type="button" size="icon" variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-600"
                  onClick={() => removeNewItem(n._tempId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          )
        })}
        </>
      )}
      </tbody>
    )
    })
  })()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            {isCreating ? (
              <h1 className="text-2xl font-bold">New Purchase Order</h1>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold font-mono">{po!.purchase_order_number}</h1>
                  <Badge variant={statusVariant[po!.status]}>{po!.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Invoice {po!.invoice_date ? formatDate(po!.invoice_date) : '—'} · {po!.supplier_name ?? '—'}
                </p>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isCreating ? (
            <>
              <Button size="sm" variant="outline" onClick={() => navigate('/purchasing/orders')} disabled={createMutation.isPending}>
                <XIcon className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {createMutation.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </>
          ) : editMode ? (
            <>
              <Button size="sm" variant="outline" onClick={cancelEditMode} disabled={updateMutation.isPending}>
                <XIcon className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              {!isCreating && (
                <Button size="sm" variant="outline" onClick={() => setExportModalOpen(true)}>
                  <FileDown className="h-4 w-4 mr-1" /> Export PDF
                </Button>
              )}
              {user?.is_staff && po!.status !== 'CANCELLED' && (
                <Button size="sm" variant="outline" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
              {user?.is_staff && po!.next_status && (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    size="sm"
                    onClick={() => setShowAdvanceModal(true)}
                  >
                    → {po!.next_status}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 1 — header row */}
      <div className="grid grid-cols-4 gap-6">
        {/* PO Information — 3 cols */}
        <div className="col-span-3 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold mb-3">Purchase Order Information</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Warehouse{isCreating && <span className="text-red-500 ml-0.5">*</span>}
                </p>
                {isCreating ? (
                  <Select
                    value={String(headerValues.warehouse_id ?? '')}
                    onValueChange={val => setHeaderField('warehouse_id', val)}
                  >
                    <SelectTrigger className="h-7 text-xs" data-testid="warehouse-select-trigger">
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w: { id: string; name: string }) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-semibold">{po?.warehouse_name ?? '—'}</p>
                )}
              </div>
              {(isCreating || (editMode && (po?.editable_fields?.header?.includes('supplier_name') ?? false))) ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                  <Select
                    value={String(headerValues.supplier_id ?? po?.supplier_id ?? '')}
                    onValueChange={val => setHeaderField('supplier_id', val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="h-7 text-xs" data-testid="supplier-select-trigger">
                      <SelectValue placeholder="No supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No supplier</SelectItem>
                      {suppliers.map((s: { id: string; name: string }) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                      <div className="border-t mt-1 pt-1 px-1 pb-1">
                        <button
                          type="button"
                          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-primary hover:bg-accent rounded-sm cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setShowNewSupplierModal(true)}
                        >
                          <Plus className="h-3 w-3" />
                          New Supplier
                        </button>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <EditableInfoItem
                  field="supplier_name"
                  label="Supplier"
                  value={po?.supplier_name}
                  editMode={editMode}
                  editable={false}
                  headerValues={headerValues}
                  setHeaderField={setHeaderField}
                />
              )}
              <EditableInfoItem
                field="forwarder_name"
                label="Forwarder"
                value={po?.forwarder_name}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('forwarder_name') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="shop_services"
                label="Jasa Belanja"
                value={po?.shop_services}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('shop_services') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="invoice_number"
                label="Invoice No."
                value={po?.invoice_number}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('invoice_number') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="invoice_date"
                label="Invoice Date"
                value={po?.invoice_date ? formatDate(po?.invoice_date) : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('invoice_date') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_order_number"
                label="Delivery Order No."
                value={po?.delivery_order_number}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('delivery_order_number') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_date"
                label="Delivery Date"
                value={po?.delivery_date ? formatDate(po?.delivery_date) : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('delivery_date') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="forecast_delivery_date"
                label="Forecast Delivery"
                value={po?.forecast_delivery_date ? formatDate(po?.forecast_delivery_date) : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('forecast_delivery_date') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-x-6 gap-y-3">
              <EditableInfoItem
                field="currency"
                label="Currency"
                value={po?.currency}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('currency') ?? false)}
                headerValues={headerValues}
                setHeaderField={handleCurrencyChange}
              />
              <EditableInfoItem
                field="exchange_rate"
                label="Exchange Rate"
                value={po?.exchange_rate != null ? `Rp ${Number(po?.exchange_rate).toLocaleString('id-ID')}` : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('exchange_rate') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="commission_fee_pct"
                label="Commission %"
                value={po?.commission_fee_pct != null ? `${po?.commission_fee_pct}%` : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('commission_fee_pct') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_fee"
                label="Delivery Fee (RMB)"
                value={po?.delivery_fee != null ? `${getCurrencySymbol(po?.currency)} ${formatForeignAmount(po?.delivery_fee)}` : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('delivery_fee') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Commission (IDR)</p>
                <p className="text-sm font-semibold">
                  {(() => {
                    const val = liveCommissionFee ?? po?.commission_fee
                    return val != null ? formatIDR(val) : '—'
                  })()}
                </p>
              </div>
              <EditableInfoItem
                field="weight"
                label="Weight (kg)"
                value={po?.weight != null ? formatDecimalUnit(po?.weight, 'kg') : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('weight') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="cbm"
                label="CBM"
                value={po?.cbm != null ? `${formatDecimalUnit(po?.cbm)} m³ (actual)` : po?.forecast_cbm != null ? `${formatDecimalUnit(po?.forecast_cbm)} m³ (forecast)` : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('cbm') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="shipping_fee_per_cbm"
                label="Shipping Fee / CBM"
                value={po?.shipping_fee_per_cbm != null ? formatIDR(po?.shipping_fee_per_cbm) : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('shipping_fee_per_cbm') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              {(() => {
                const effectiveShippingPerCbm = Number(
                  headerValues.shipping_fee_per_cbm ?? po?.shipping_fee_per_cbm ?? 0
                )
                if (effectiveShippingPerCbm <= 0) return null
                const poStatus = po?.status
                if (poStatus === 'DELIVERED' || poStatus === 'COMPLETED' || poStatus === 'CANCELLED') return null
                const noDimsCount = (po?.order_details ?? []).filter(
                  item => item.product_has_dimensions === false
                ).length
                if (noDimsCount === 0) return null
                return (
                  <div className="col-span-2 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    <span>⚠</span>
                    <span>
                      {noDimsCount} item{noDimsCount > 1 ? 's' : ''} have no product dimensions — shipping fee not allocated to those items.
                    </span>
                  </div>
                )
              })()}
              <EditableInfoItem
                field="forecast_cbm"
                label="Forecast CBM"
                value={po?.forecast_cbm != null ? formatDecimalUnit(po?.forecast_cbm, 'm3') : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('forecast_cbm') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="forecast_shipping_fee_per_cbm"
                label="Forecast Shipping/CBM"
                value={po?.forecast_shipping_fee_per_cbm != null ? formatIDR(po?.forecast_shipping_fee_per_cbm) : null}
                editMode={editMode}
                editable={isCreating || (po?.editable_fields?.header?.includes('forecast_shipping_fee_per_cbm') ?? false)}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />

            </div>
          </div>
          {/* Attachments card */}
          {!isCreating && <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Attachments</h2>
            <div className="grid grid-cols-4 gap-3">
              {attachments.map(({ label, field, url }) => {
                const isFileEditable =
                  (editMode &&
                    (po?.editable_fields?.header?.includes(field) ?? false) &&
                    !(po?.status === 'COMPLETED' && !!url)) ?? false
                const fileSelected = !!headerValues[field]
                return (
                  <div key={label} className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white",
                      url || fileSelected ? "bg-red-600" : "bg-muted"
                    )}>
                      PDF
                    </div>
                    <div className="space-y-0.5">
                      <p className={cn("text-xs font-semibold leading-tight", !url && !fileSelected && "text-muted-foreground")}>
                        {label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight">
                        {fileSelected ? 'Ready' : url ? 'Uploaded' : 'Not uploaded'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      {url && !fileSelected && (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="w-full text-xs h-7">
                            <ExternalLink className="h-3 w-3 mr-1" /> View
                          </Button>
                        </a>
                      )}
                      {isFileEditable && (
                        <label className="cursor-pointer w-full">
                          <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) setHeaderField(field, file)
                            }}
                          />
                          <Button size="sm" variant="outline" className="w-full text-xs h-7" asChild>
                            <span>{fileSelected ? '\u2713 Ready' : url ? 'Replace' : 'Upload'}</span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>}
        </div>
        {/* Summary + Attachments sidebar — 1 col */}
        <div className="space-y-4">
          {/* Financial Summary card */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">
              {isCreating ? 'Estimated Summary' : 'Financial Summary'}
            </h2>
            {isCreating ? (() => {
              const estGoods = newItems.reduce((s, n) => {
                const price = hasDiscount ? (Number(n.discounted_unit_price_foreign) || Number(n.unit_price_foreign) || 0) : (Number(n.unit_price_foreign) || 0)
                return s + price * (Number(n.ordered_qty) || 0)
  }, 0) * poExchangeRate
  const estGoodsForeign = newItems.reduce((s, n) => {
    const price = hasDiscount
      ? (Number(n.discounted_unit_price_foreign) || Number(n.unit_price_foreign) || 0)
      : (Number(n.unit_price_foreign) || 0)
    return s + price * (Number(n.ordered_qty) || 0)
  }, 0)
  const estCurrencySymbol = getCurrencySymbol(String(headerValues.currency ?? ''))
  const estForeignLabel = `Goods (${String(headerValues.currency ?? 'Foreign')})`
  const commPct = Number(headerValues.commission_fee_pct) || 0
              const estCommission = Math.round(newItems.reduce((s, n) => {
                const price = hasDiscount ? (Number(n.discounted_unit_price_foreign) || Number(n.unit_price_foreign) || 0) : (Number(n.unit_price_foreign) || 0)
                return s + price * (Number(n.ordered_qty) || 0)
              }, 0) * (commPct / 100) * poExchangeRate)
              const estFreight = Math.round((Number(headerValues.forecast_cbm) || 0) * (Number(headerValues.forecast_shipping_fee_per_cbm) || 0))
              const estDelivery = Math.round((Number(headerValues.delivery_fee) || 0) * poExchangeRate)
              const estTotal = Math.round(estGoods) + estCommission + estFreight + estDelivery
              const totalUnits = newItems.reduce((s, n) => s + (Number(n.ordered_qty) || 0), 0)
              const totalSkus = newItems.filter(n => n.product_variant_id).length
              return (
                <div className="space-y-3 text-sm">
                  <SummaryRow label="Goods" value={estGoods > 0 ? formatIDR(Math.round(estGoods)) : '—'} />
                  {estGoodsForeign > 0 && (
                    <SummaryRow
                      label={estForeignLabel}
                      value={`${estCurrencySymbol} ${formatForeignAmount(estGoodsForeign)}`}
                    />
                  )}
                  <SummaryRow label="Commission" value={estCommission > 0 ? formatIDR(estCommission) : '—'} />
                  <SummaryRow label="Forecast Freight" value={estFreight > 0 ? formatIDR(estFreight) : '—'} />
                  <SummaryRow label="Supplier Delivery" value={estDelivery > 0 ? formatIDR(estDelivery) : '—'} />
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                    <span>Est. Total</span>
                    <span>{estTotal > 0 ? formatIDR(estTotal) : '—'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">{totalUnits} units · {totalSkus} SKUs</p>
                </div>
              )
            })() : (() => {
              const totalForeignAmount = (po!.order_details ?? []).reduce(
                (s, i) => s + Number(
                  hasDiscount
                    ? (i.discounted_total_price_foreign ?? i.total_price_foreign ?? 0)
                    : (i.total_price_foreign ?? i.discounted_total_price_foreign ?? 0)
                ),
                0
              )
              const currencySymbol = getCurrencySymbol(po!.currency)
              const foreignLabel = `Goods (${po!.currency ?? 'Foreign'})`
              return (
                <>
                  <div className="space-y-3 text-sm">
                    <SummaryRow label="Goods" value={computedGoodsAmount > 0 ? formatIDR(computedGoodsAmount) : '—'} />
                    {totalForeignAmount > 0 && (
                      <SummaryRow
                        label={foreignLabel}
                        value={`${currencySymbol} ${formatForeignAmount(totalForeignAmount)}`}
                      />
                    )}
                    <SummaryRow label="Commission" value={(() => { const val = liveCommissionFee ?? po!.commission_fee; return val != null ? formatIDR(val) : '—' })()} />
                    <SummaryRow label="Supplier Delivery" value={deliveryFeeIdr > 0 ? formatIDR(deliveryFeeIdr) : '—'} />
                    <SummaryRow label="Freight" value={(po!.shipping_fee ?? 0) > 0 ? formatIDR(po!.shipping_fee!) : '—'} />
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                      <span>Total Amount</span>
                      <span>{formatIDR(po!.total_amount)}</span>
                    </div>
                  </div>
                  <div className="border-t pt-3 mt-3 space-y-3">
                    <StatBox label="COGS Ratio" value={po!.cost_ratio_cogs != null ? `${po!.cost_ratio_cogs.toFixed(2)}%` : '—'} />
                  </div>
                </>
              )
            })()}
          </div>

          {/* Order Summary card */}
          {!isCreating && <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Ordered</span>
                <span className="font-semibold">{po!.total_ordered_qty} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Received</span>
                <span className="font-semibold">{po!.total_received_qty} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line Items</span>
                <span className="font-semibold">{po!.order_details?.length ?? 0} SKUs</span>
              </div>
              {po!.cbm && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CBM</span>
                  <span className="font-semibold">{po!.cbm} m³</span>
                </div>
              )}
            </div>
          </div>}
          {/* Status History card */}
          {!isCreating && po?.status_history && po.status_history.length > 0 && (
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">Status History</h2>
              <div className="space-y-3">
                {po!.status_history.map((entry, i) => (
                  <div key={entry.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                      {i < po!.status_history.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant={statusVariant[entry.to_status]}>{entry.to_status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.changed_by_name ?? 'System'} · {formatDate(entry.cdate)}
                      </p>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-0.5">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2 — Notes (full width) */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold mb-3">Notes</h2>
        {editMode ? (
          <Textarea
            className="min-h-[80px] text-sm"
            placeholder="Add notes..."
            value={String(headerValues['note'] ?? '')}
            onChange={e => setHeaderField('note', e.target.value)}
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {(isCreating ? String(headerValues.note ?? '') : po?.note) || 'No notes'}
          </p>
        )}
      </div>

      {/* Section 3 — Order Items (full width) */}
      <div className="rounded-lg border bg-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Order Items</h2>
            <div className="flex items-center gap-3">
            <div className="flex rounded-md border overflow-hidden text-xs h-6">
              <button
                type="button"
                className={`px-2 ${avgWindow === 7 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                onClick={() => setAvgWindow(7)}
              >7d</button>
              <button
                type="button"
                className={`px-2 ${avgWindow === 14 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                onClick={() => setAvgWindow(14)}
              >14d</button>
              <button
                type="button"
                className={`px-2 ${avgWindow === 30 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                onClick={() => setAvgWindow(30)}
              >30d</button>
            </div>
            {!isCreating && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Group by:</span>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="h-6 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    {availableGroupKeys.map(k => (
                      <SelectItem key={k} value={k}>
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              )}
            {!isCreating && allGroupKeys.length > 0 && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => {
                  if (allCollapsed) setCollapsedGroups(new Set())
                  else setCollapsedGroups(new Set(allGroupKeys))
                }}
              >
                {allCollapsed ? 'Expand all' : 'Collapse all'}
              </button>
            )}
            {editMode && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasDiscount}
                  onChange={e => setHasDiscount(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                Has Discount
              </label>
            )}
            {editMode && canAddDeleteItems && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowImportWizard(true)}
                disabled={!activeSupplierId}
                title={!activeSupplierId ? 'Set a supplier on this PO first' : undefined}
              >
                <Upload className="h-3 w-3 mr-1" /> Import from Excel
              </Button>
            )}
            {editMode && canAddDeleteItems && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAddItemModalOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground">
                <th className="w-8" />
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[160px]">Variant</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Rec.</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Order</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Receive</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">SOH</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Incoming</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Upcoming</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">AVG</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">DOI</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">DOI+</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Unit Price</th>
                {hasDiscount && <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Disc. Price</th>}
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Unit Rp</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Total</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Total Rp</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">COGS/u</th>
                <th className="px-3 py-2 text-left font-medium">Remarks</th>
                {editMode && canAddDeleteItems && <th className="w-8" />}
              </tr>
            </thead>
            {orderItemsContent}
          </table>
        </div>
      </div>

      {!isCreating && po?.next_status && (
        <StatusAdvanceModal
          open={showAdvanceModal}
          onClose={() => setShowAdvanceModal(false)}
          po={po!}
          targetStatus={po!.next_status}
        />
      )}
      <AddItemModal
        open={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onAdd={handleAddItemFromModal}
        hasDiscount={hasDiscount}
        stockMap={stockMap}
        avgWindow={avgWindow}
        currency={po?.currency ?? String(headerValues.currency ?? '')}
        excludeVariantIds={usedVariantIds}
        supplierId={activeSupplierId}
      />

      {!isCreating && po && (
        <PurchaseOrderExportModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          po={po}
        />
      )}
      <ValidationModal
        errors={validationErrors}
        onClose={() => setValidationErrors([])}
        title="Save Error"
      />
      <SupplierFormModal
        open={showNewSupplierModal}
        onClose={() => setShowNewSupplierModal(false)}
        onCreated={(s) => {
          setHeaderField('supplier_id', s.id)
          setShowNewSupplierModal(false)
        }}
      />
      {!isCreating && po && (
        <SourcingImportWizard
          open={showImportWizard}
          onClose={() => setShowImportWizard(false)}
          poId={po.id}
          supplierId={activeSupplierId ?? ''}
          supplierName={suppliers?.find((s) => s.id === activeSupplierId)?.name ?? ''}
        />
      )}
    </div>
  )
}

function EditableInfoItem({
  field, label, value, editMode, editable, headerValues, setHeaderField,
}: {
  field: string
  label: string
  value: string | number | null | undefined
  editMode: boolean
  editable: boolean
  headerValues: Record<string, string | File>
  setHeaderField: (field: string, value: string | File) => void
}) {
  const cfg = HEADER_FIELD_CONFIG[field]
  if (editMode && editable && cfg) {
    if (cfg.inputType === 'select' && cfg.options) {
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <Select
            value={String(headerValues[field] ?? value ?? '')}
            onValueChange={val => setHeaderField(field, val)}
          >
            <SelectTrigger className="h-7 text-xs" data-testid={field === 'currency' ? 'currency-select-trigger' : undefined}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {cfg.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }
    if (cfg.inputType === 'file') {
      const existingUrl = typeof value === 'string' && value ? value : null
      return (
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <div className="space-y-1">
            {existingUrl && (
              <a href={existingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> View current
              </a>
            )}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-muted file:text-foreground"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) setHeaderField(field, file)
              }}
            />
          </div>
        </div>
      )
    }
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <Input
          type={cfg.inputType}
          step={cfg.step}
          className="h-7 text-xs"
          value={String(headerValues[field] ?? '')}
          onChange={e => setHeaderField(field, e.target.value)}
        />
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">{value ?? '—'}</p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-sm font-bold", highlight && "text-primary")}>{value}</p>
    </div>
  )
}

type RowDraft = ModalDraftItem & { tempId: string }

function makeEmptyRow(): RowDraft {
  return {
    tempId: `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    product_variant_id: '',
    product_variant_label: '',
    product_id: '',
    product_name: '',
    product_supplier_link: null,
    product_photo_url: null,
    ordered_qty: '1',
    unit_price_foreign: '',
    discounted_unit_price_foreign: '',
  }
}

function AddItemRow({
  row, index, stockMap, avgWindow, currency, hasDiscount, showAll, supplierId,
  allExcluded, onUpdate, onRemove, canRemove, onQuickCreated,
}: {
  row: RowDraft
  index: number
  stockMap: Map<string, ReplenishmentItem>
  avgWindow: 7 | 14 | 30
  currency: string
  hasDiscount: boolean
  showAll: boolean
  supplierId?: string
  allExcluded: Set<string>
  onUpdate: (patch: Partial<RowDraft>) => void
  onRemove: () => void
  canRemove: boolean
  onQuickCreated?: (variants: Array<{
    id: string
    label: string
    productId: string
    productName: string
    productSupplierLink: string | null
    productPhotoUrl: string | null
    lastUnitPriceForeign: string | null
    lastCurrency: string | null
    lastDiscountedUnitPriceForeign: string | null
  }>) => void
}) {
  const rowExcluded = useMemo(() => {
    const s = new Set(allExcluded)
    if (row.product_variant_id) s.delete(row.product_variant_id)
    return s
  }, [allExcluded, row.product_variant_id])

  const liveStats = row.product_variant_id ? stockMap.get(row.product_variant_id) : undefined
  const ordQty = Number(row.ordered_qty) || 0
  const liveSoh = liveStats?.stock_on_hand ?? 0
  const liveIncoming = liveStats?.incoming_qty ?? 0
  const rawAvg = liveStats ? (avgWindow === 7 ? liveStats.avg_sales_7d : avgWindow === 14 ? liveStats.avg_sales_14d : liveStats.avg_sales_30d) : 0
  const avg = rawAvg > 0 ? rawAvg : (liveStats ? 1 / avgWindow : 0)
  const doi = liveStats && avg > 0 ? Math.round((liveSoh + liveIncoming) / avg) : null
  const doiAfter = liveStats && avg > 0 && ordQty > 0 ? Math.round((liveSoh + liveIncoming + ordQty) / avg) : null

  return (
    <div className="rounded-lg border bg-card p-2 space-y-1.5">
      <div className="flex items-start gap-1.5">
        <span className="text-xs text-muted-foreground w-4 pt-1.5 shrink-0 text-right">{index + 1}</span>

        <div className="flex-1 min-w-0">
          <VariantSearchSelect
            value={row.product_variant_id}
            selectedLabel={row.product_variant_label}
            excludeVariantIds={rowExcluded}
            supplierId={showAll ? undefined : supplierId}
            onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency, lastDiscountedUnitPriceForeign) => {
              const autoFill =
                lastUnitPriceForeign &&
                lastCurrency &&
                lastCurrency === currency &&
                parseFloat(lastUnitPriceForeign) > 0
              const autoFillDiscount =
                hasDiscount &&
                lastDiscountedUnitPriceForeign &&
                lastCurrency === currency &&
                parseFloat(lastDiscountedUnitPriceForeign) > 0
              onUpdate({
                product_variant_id: id,
                product_variant_label: label,
                product_id: productId,
                product_name: productName,
                product_supplier_link: productSupplierLink ?? null,
                product_photo_url: productPhotoUrl ?? null,
                ...(autoFill ? { unit_price_foreign: lastUnitPriceForeign! } : {}),
                ...(autoFillDiscount ? { discounted_unit_price_foreign: lastDiscountedUnitPriceForeign! } : {}),
              })
            }}
            onQuickCreated={onQuickCreated}
            placeholder="Search variant..."
          />
          {liveStats && (
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              SOH {liveSoh} · Inc {liveIncoming} · {avg > 0 ? `${avg.toFixed(1)}/d` : '—'} · DOI {doi !== null ? `${doi}d` : '∞'} → {doiAfter !== null ? `${doiAfter}d` : (ordQty > 0 ? '∞' : '—')}
            </p>
          )}
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pl-5">
        <div className="w-20 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">Qty <span className="text-red-500">*</span></p>
          <Input
            type="number"
            min="1"
            className="h-7 text-xs"
            value={row.ordered_qty}
            onChange={e => onUpdate({ ordered_qty: e.target.value })}
          />
        </div>
        <div className="w-28 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">Unit Price ({getCurrencySymbol(currency)})</p>
          <Input
            type="number"
            step="0.001"
            className="h-7 text-xs"
            value={row.unit_price_foreign}
            onChange={e => onUpdate({ unit_price_foreign: e.target.value })}
          />
        </div>
        {hasDiscount && (
          <div className="w-28 shrink-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Disc. Price ({getCurrencySymbol(currency)})</p>
            <Input
              type="number"
              step="0.001"
              className="h-7 text-xs"
              value={row.discounted_unit_price_foreign}
              onChange={e => onUpdate({ discounted_unit_price_foreign: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function AddItemModal({
  open, onClose, onAdd, hasDiscount, stockMap, avgWindow, currency, excludeVariantIds, supplierId,
}: {
  open: boolean
  onClose: () => void
  onAdd: (items: ModalDraftItem[]) => void
  hasDiscount: boolean
  stockMap: Map<string, ReplenishmentItem>
  avgWindow: 7 | 14 | 30
  currency: string
  excludeVariantIds: Set<string>
  supplierId?: string
}) {
  const [rows, setRows] = useState<RowDraft[]>([makeEmptyRow()])
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkQty, setBulkQty] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([makeEmptyRow()])
      setBulkPrice('')
      setBulkQty('')
      setShowAll(false)
      setError('')
    }
  }, [open])

  const allExcluded = useMemo(() => {
    const combined = new Set(excludeVariantIds)
    for (const r of rows) if (r.product_variant_id) combined.add(r.product_variant_id)
    return combined
  }, [excludeVariantIds, rows])

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()])

  const removeRow = (tempId: string) =>
    setRows(prev => prev.length > 1 ? prev.filter(r => r.tempId !== tempId) : prev)

  const updateRow = (tempId: string, patch: Partial<RowDraft>) =>
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, ...patch } : r))

  const handleQuickCreated = (
    tempId: string,
    variants: Array<{
      id: string
      label: string
      productId: string
      productName: string
      productSupplierLink: string | null
      productPhotoUrl: string | null
      lastUnitPriceForeign: string | null
      lastCurrency: string | null
      lastDiscountedUnitPriceForeign: string | null
    }>,
  ) => {
    if (variants.length === 0) return
    const first = variants[0]
    const autoFillFirst =
      first.lastUnitPriceForeign &&
      first.lastCurrency === currency &&
      parseFloat(first.lastUnitPriceForeign) > 0
    const autoFillDiscFirst =
      hasDiscount &&
      first.lastDiscountedUnitPriceForeign &&
      parseFloat(first.lastDiscountedUnitPriceForeign) > 0

    updateRow(tempId, {
      product_variant_id: first.id,
      product_variant_label: first.label,
      product_id: first.productId,
      product_name: first.productName,
      product_supplier_link: first.productSupplierLink,
      product_photo_url: first.productPhotoUrl,
      ...(autoFillFirst ? { unit_price_foreign: first.lastUnitPriceForeign! } : {}),
      ...(autoFillDiscFirst ? { discounted_unit_price_foreign: first.lastDiscountedUnitPriceForeign! } : {}),
    })

    const rest = variants.slice(1)
    if (rest.length > 0) {
      setRows(prev => {
        const newRows = rest.map(v => {
          const autoFill =
            v.lastUnitPriceForeign &&
            v.lastCurrency === currency &&
            parseFloat(v.lastUnitPriceForeign) > 0
          const autoFillDisc =
            hasDiscount &&
            v.lastDiscountedUnitPriceForeign &&
            parseFloat(v.lastDiscountedUnitPriceForeign) > 0
          return {
            ...makeEmptyRow(),
            product_variant_id: v.id,
            product_variant_label: v.label,
            product_id: v.productId,
            product_name: v.productName,
            product_supplier_link: v.productSupplierLink,
            product_photo_url: v.productPhotoUrl,
            ...(autoFill ? { unit_price_foreign: v.lastUnitPriceForeign! } : {}),
            ...(autoFillDisc ? { discounted_unit_price_foreign: v.lastDiscountedUnitPriceForeign! } : {}),
          }
        })
        const currentIdx = prev.findIndex(r => r.tempId === tempId)
        if (currentIdx === -1) return [...prev, ...newRows]
        return [...prev.slice(0, currentIdx + 1), ...newRows, ...prev.slice(currentIdx + 1)]
      })
    }
  }

  const handleBulkPrice = (val: string) => {
    setBulkPrice(val)
    setRows(prev => prev.map(r => ({
      ...r,
      unit_price_foreign: val,
      ...(hasDiscount ? { discounted_unit_price_foreign: val } : {}),
    })))
  }

  const handleBulkQty = (val: string) => {
    setBulkQty(val)
    setRows(prev => prev.map(r => ({
      ...r,
      ordered_qty: val,
    })))
  }

  const handleConfirm = () => {
    const valid = rows.filter(r => r.product_variant_id && Number(r.ordered_qty) > 0)
    if (valid.length === 0) { setError('Add at least one item with a variant and quantity.'); return }
    onAdd(valid.map(r => ({
  product_variant_id: r.product_variant_id,
  product_variant_label: r.product_variant_label,
  product_id: r.product_id,
  product_name: r.product_name,
  product_supplier_link: r.product_supplier_link,
  product_photo_url: r.product_photo_url,
  ordered_qty: r.ordered_qty,
  unit_price_foreign: r.unit_price_foreign,
  discounted_unit_price_foreign: r.discounted_unit_price_foreign,
})))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>Add Items</DialogTitle>
          {supplierId && (
            <button
              type="button"
              onClick={() => setShowAll(prev => !prev)}
              className={`text-xs px-2 py-1 rounded border ${showAll ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {showAll ? 'Filtered off' : 'Filter by supplier'}
            </button>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 min-h-0 overflow-y-auto">
          {/* Bulk inputs */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                Bulk unit price ({getCurrencySymbol(currency)})
              </label>
              <Input
                type="number"
                step="0.001"
                className="h-7 text-xs w-36"
                placeholder="Apply to all rows"
                value={bulkPrice}
                onChange={e => handleBulkPrice(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                Bulk qty
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                className="h-7 text-xs w-24"
                placeholder="Apply to all rows"
                value={bulkQty}
                onChange={e => handleBulkQty(e.target.value)}
              />
            </div>
          </div>

          {/* Row list */}
          <div className="space-y-2 pr-1">
            {rows.map((row, idx) => (
              <AddItemRow
                key={row.tempId}
                row={row}
                index={idx}
                stockMap={stockMap}
                avgWindow={avgWindow}
                currency={currency}
                hasDiscount={hasDiscount}
                showAll={showAll}
                supplierId={supplierId}
                allExcluded={allExcluded}
                onUpdate={patch => updateRow(row.tempId, patch)}
                onRemove={() => removeRow(row.tempId)}
                canRemove={rows.length > 1}
                onQuickCreated={variants => handleQuickCreated(row.tempId, variants)}
              />
            ))}

            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
            >
              <Plus className="h-3 w-3" /> Add row
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={rows.every(r => !r.product_variant_id)}
          >
            Add {rows.filter(r => r.product_variant_id && Number(r.ordered_qty) > 0).length || ''} item{rows.filter(r => r.product_variant_id && Number(r.ordered_qty) > 0).length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ValidationModal({ errors, onClose, title }: { errors: string[]; onClose: () => void; title?: string }) {
  if (errors.length === 0) return null
  return (
    <Dialog open={errors.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? 'Validation Error'}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-600">
              <span className="shrink-0">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button size="sm" onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
