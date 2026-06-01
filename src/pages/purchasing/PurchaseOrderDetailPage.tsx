import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePurchaseOrder, useUpdatePurchaseOrder } from '../../hooks/usePurchasing'
import { useAuth } from '../../contexts/AuthContext'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { StatusAdvanceModal } from '../../components/modals/StatusAdvanceModal'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ArrowLeft, ChevronRight, ExternalLink, Pencil, Save, Trash2, Plus, X as XIcon } from 'lucide-react'
import { cn, formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
import type { POStatus, PurchaseOrderDetail } from '../../types/purchasing'
import type { BadgeProps } from '../../components/ui/badge'

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
  cogs_ratio_forecast:         { label: 'COGS Forecast %',    inputType: 'number', step: '0.01' },
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
  const { data: po, isLoading } = usePurchaseOrder(id!)
  const { user } = useAuth()
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
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
  const updateMutation = useUpdatePurchaseOrder()
  const [hasDiscount, setHasDiscount] = useState(false)
  const [expandedCostAnalysis, setExpandedCostAnalysis] = useState<Set<string>>(new Set())
  const toggleCostAnalysis = (key: string) =>
    setExpandedCostAnalysis(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  useEffect(() => {
    if (!po) return
    const anyDiscounted = (po.order_details ?? []).some(item =>
      item.discounted_unit_price_foreign != null &&
      item.discounted_unit_price_foreign !== item.unit_price_foreign
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasDiscount(anyDiscounted)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- po is compared by id
  }, [po?.id])

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found</div>

  const canAddDeleteItems = po.status === 'DRAFT' || po.status === 'ORDERED'

  const deliveryFeeIdr = Math.round(
    Number(po.delivery_fee ?? 0) * Number(po.exchange_rate ?? 0)
  )

  const attachments = [
    { label: 'PO Invoice',     field: 'purchase_order_invoice_file',  url: po.purchase_order_invoice_file },
    { label: 'Delivery Order', field: 'delivery_order_file',           url: po.delivery_order_file },
    { label: 'DO Invoice',     field: 'delivery_order_invoice_file',   url: po.delivery_order_invoice_file },
    { label: 'Packing List',   field: 'packing_list_file',             url: po.packing_list_file },
  ]

  const getFilename = (url: string) =>
    decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'file')

  const enterEditMode = () => {
    const initial: Record<string, string | File> = {}
    for (const field of po.editable_fields.header) {
      if (field === 'note') {
        initial[field] = po.note ?? ''
        continue
      }
      if (['purchase_order_invoice_file', 'delivery_order_file', 'delivery_order_invoice_file', 'packing_list_file'].includes(field)) {
        continue
      }
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

  const addNewItem = () =>
    setNewItems(prev => [...prev, {
      _tempId: `new-${Date.now()}-${prev.length}`,
      product_variant_id: '',
      product_variant_label: '',
      product_id: '',
      product_name: '',
      product_supplier_link: null,
      product_photo_url: null,
      ordered_qty: '1',
      unit_price_foreign: '',
      discounted_unit_price_foreign: '',
    }])

  const removeNewItem = (_tempId: string) =>
    setNewItems(prev => prev.filter(n => n._tempId !== _tempId))

  const updateNewItem = (_tempId: string, field: string, value: string) =>
    setNewItems(prev => prev.map(n => n._tempId === _tempId ? { ...n, [field]: value } : n))

  const deleteExistingItem = (itemId: string) =>
    setDeletedDetailIds(prev => new Set([...prev, itemId]))

  const handleSave = async () => {
    const payload: Record<string, unknown> = {}
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
      await updateMutation.mutateAsync({ id: po.id, data: payload })
      toast.success('Purchase order updated')
      cancelEditMode()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to save'
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{po.purchase_order_number}</h1>
              <Badge variant={statusVariant[po.status]}>{po.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Invoice {po.invoice_date ? formatDate(po.invoice_date) : '—'} · {po.supplier_name ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
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
              {user?.is_staff && po.status !== 'CANCELLED' && (
                <Button size="sm" variant="outline" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
              {user?.is_staff && po.next_status && (
                <Button size="sm" onClick={() => setShowAdvanceModal(true)}>
                  → {po.next_status}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Section 1 — header row */}
      <div className="grid grid-cols-4 gap-6">
        {/* PO Information — 3 cols */}
        <div className="col-span-3">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Purchase Order Information</h2>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 mb-5">
              <EditableInfoItem
                field="supplier_name"
                label="Supplier"
                value={po.supplier_name}
                editMode={editMode}
                editable={po.editable_fields.header.includes('supplier_name')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="forwarder_name"
                label="Forwarder"
                value={po.forwarder_name}
                editMode={editMode}
                editable={po.editable_fields.header.includes('forwarder_name')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="shop_services"
                label="Jasa Belanja"
                value={po.shop_services}
                editMode={editMode}
                editable={po.editable_fields.header.includes('shop_services')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="invoice_number"
                label="Invoice No."
                value={po.invoice_number}
                editMode={editMode}
                editable={po.editable_fields.header.includes('invoice_number')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="invoice_date"
                label="Invoice Date"
                value={po.invoice_date ? formatDate(po.invoice_date) : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('invoice_date')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_order_number"
                label="Delivery Order No."
                value={po.delivery_order_number}
                editMode={editMode}
                editable={po.editable_fields.header.includes('delivery_order_number')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_date"
                label="Delivery Date"
                value={po.delivery_date ? formatDate(po.delivery_date) : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('delivery_date')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="forecast_delivery_date"
                label="Forecast Delivery"
                value={po.forecast_delivery_date ? formatDate(po.forecast_delivery_date) : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('forecast_delivery_date')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
            </div>
            <div className="border-t pt-4 grid grid-cols-1 gap-x-8 gap-y-4">
              <EditableInfoItem
                field="currency"
                label="Currency"
                value={po.currency}
                editMode={editMode}
                editable={po.editable_fields.header.includes('currency')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="exchange_rate"
                label="Exchange Rate"
                value={po.exchange_rate != null ? `Rp ${Number(po.exchange_rate).toLocaleString('id-ID')}` : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('exchange_rate')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="commission_fee_pct"
                label="Commission %"
                value={po.commission_fee_pct != null ? `${po.commission_fee_pct}%` : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('commission_fee_pct')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="cogs_ratio_forecast"
                label="COGS Forecast %"
                value={po.cogs_ratio_forecast != null ? `${po.cogs_ratio_forecast}%` : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('cogs_ratio_forecast')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="delivery_fee"
                label="Delivery Fee (RMB)"
                value={po.delivery_fee != null ? `${getCurrencySymbol(po.currency)} ${formatForeignAmount(po.delivery_fee)}` : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('delivery_fee')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Commission (IDR)</p>
                <p className="text-sm font-semibold">{po.commission_fee != null ? formatIDR(po.commission_fee) : '—'}</p>
              </div>
              <EditableInfoItem
                field="cbm"
                label="CBM"
                value={po.cbm != null ? `${formatDecimalUnit(po.cbm)} m³ (actual)` : po.forecast_cbm != null ? `${formatDecimalUnit(po.forecast_cbm)} m³ (forecast)` : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('cbm')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="weight"
                label="Weight (kg)"
                value={po.weight != null ? formatDecimalUnit(po.weight, 'kg') : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('weight')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="shipping_fee_per_cbm"
                label="Shipping Fee / CBM"
                value={po.shipping_fee_per_cbm != null ? formatIDR(po.shipping_fee_per_cbm) : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('shipping_fee_per_cbm')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Freight (IDR)</p>
                <p className="text-sm font-semibold">
                  {po.shipping_fee != null && po.shipping_fee > 0 ? formatIDR(po.shipping_fee) : '—'}
                </p>
              </div>
              <EditableInfoItem
                field="forecast_cbm"
                label="Forecast CBM"
                value={po.forecast_cbm != null ? formatDecimalUnit(po.forecast_cbm, 'm3') : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('forecast_cbm')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
              <EditableInfoItem
                field="forecast_shipping_fee"
                label="Forecast Shipping"
                value={po.forecast_shipping_fee != null ? formatIDR(po.forecast_shipping_fee) : null}
                editMode={editMode}
                editable={po.editable_fields.header.includes('forecast_shipping_fee')}
                headerValues={headerValues}
                setHeaderField={setHeaderField}
              />
            </div>
          </div>
        </div>
        {/* Summary + Attachments sidebar — 1 col */}
        <div className="space-y-4">
          {/* Financial Summary card */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Financial Summary</h2>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Goods" value={po.total_item_amount != null ? formatIDR(po.total_item_amount) : '—'} />
              <SummaryRow label="Commission" value={po.commission_fee != null ? formatIDR(po.commission_fee) : '—'} />
              <SummaryRow label="Supplier Delivery" value={deliveryFeeIdr > 0 ? formatIDR(deliveryFeeIdr) : '—'} />
              <SummaryRow label="Freight" value={po.shipping_fee != null ? formatIDR(po.shipping_fee) : '—'} />
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Total Amount</span>
                <span>{formatIDR(po.total_amount)}</span>
              </div>
            </div>
            <div className="border-t pt-3 mt-3 space-y-3">
              <StatBox label="COGS Ratio" value={po.cost_ratio_cogs != null ? `${po.cost_ratio_cogs.toFixed(2)}%` : '—'} />
              <StatBox label="COGS Forecast %" value={po.cogs_ratio_forecast != null ? `${po.cogs_ratio_forecast}%` : '—'} />
            </div>
          </div>
          {/* Attachments card */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Attachments</h2>
            <div className="space-y-3">
              {attachments.map(({ label, field, url }) => {
                const isFileEditable = editMode && po.editable_fields.header.includes(field)
                const fileSelected = !!headerValues[field]
                return (
                  <div key={label} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg text-xs font-bold text-white",
                        url || fileSelected ? "bg-red-600" : "bg-muted"
                      )}>
                        PDF
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", !url && !fileSelected && "text-muted-foreground")}>
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fileSelected
                            ? 'Ready to upload'
                            : url ? getFilename(url) : 'Not uploaded'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {url && !fileSelected && (
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </a>
                      )}
                      {isFileEditable && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            accept="application/pdf,image/*"
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (file) setHeaderField(field, file)
                            }}
                          />
                          <Button size="sm" variant="outline" asChild>
                            <span>{fileSelected ? '\u2713 Ready' : url ? 'Replace' : 'Upload'}</span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
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
            {po.note || 'No notes'}
          </p>
        )}
      </div>

      {/* Section 3 — Order Items (full width) */}
      <div className="rounded-lg border bg-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Order Items</h2>
          <div className="flex items-center gap-3">
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
              <Button type="button" size="sm" variant="outline" onClick={addNewItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            )}
          </div>
        </div>
        <div className={`grid ${hasDiscount ? 'grid-cols-[1fr_60px_60px_100px_100px_100px_1fr_32px]' : 'grid-cols-[1fr_60px_60px_100px_100px_1fr_32px]'} gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30`}>
          <span>Variant</span>
          <span className="text-right">Ordered</span>
          <span className="text-right">Received</span>
          <span className="text-right">Unit Price</span>
          {hasDiscount && <span className="text-right">Disc. Price</span>}
          <span className="text-right">Total (IDR)</span>
          <span>Remarks</span>
          <span />
        </div>
        {(() => {
          const poExchangeRate = Number(po.exchange_rate ?? 0)
          const freightPerUnit = po.shipping_fee && po.total_ordered_qty
            ? Math.round(po.shipping_fee / po.total_ordered_qty)
            : 0
          const commissionPerUnit = po.commission_fee && po.total_ordered_qty
            ? Math.round(po.commission_fee / po.total_ordered_qty)
            : 0
          const cogsRatioForecast = po.cogs_ratio_forecast != null
            ? Number(po.cogs_ratio_forecast)
            : null

          const visibleDetails = (po.order_details ?? []).filter(item => !deletedDetailIds.has(item.id))

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
            const key = item.product_id || 'unknown'
            if (!groupMap.has(key)) {
              groupMap.set(key, {
                groupKey: key,
                productName: item.product_name || 'Unknown Product',
                productSupplierLink: item.product_supplier_link,
                productPhotoUrl: item.product_photo_url ?? null,
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

          return Array.from(groupMap.values()).map(group => {
          const groupQty = group.existingItems.reduce((s, i) => s + i.ordered_qty, 0) +
            group.newItemsList.reduce((s, n) => s + Number(n.ordered_qty || 0), 0)
          const groupCost = group.existingItems.reduce((s, i) => {
            if (hasDiscount) return s + (i.discounted_total_price_base ?? i.total_price_base ?? 0)
            return s + (i.total_price_base ?? i.discounted_total_price_base ?? 0)
          }, 0)
          const showRemarks = po.editable_fields.order_detail.includes('remarks') && editMode

          return (
            <div key={group.groupKey}>
              <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 border-b">
                {group.productPhotoUrl ? (
                  <img
                    src={group.productPhotoUrl}
                    alt={group.productName}
                    className="h-8 w-8 rounded object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground">
                    <span className="text-xs">—</span>
                  </div>
                )}
                <span className="text-sm font-bold text-foreground flex-1">{group.productName}</span>
                {group.productSupplierLink && (
                  <a href={group.productSupplierLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs font-medium">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Supplier</span>
                  </a>
                )}
                <span className="text-xs text-muted-foreground">Qty: <span className="font-bold text-foreground">{groupQty}</span></span>
                <span className="text-xs text-muted-foreground">Cost: <span className="font-bold text-foreground">{groupCost > 0 ? formatIDR(groupCost) : '—'}</span></span>
              </div>
              {group.existingItems.map(item => {
                const rowChanges = detailValues[item.id] ?? {}
                const isDetailEditable = (field: string) =>
                  editMode && po.editable_fields.order_detail.includes(field)
                return (
                  <div key={item.id} className={`grid ${hasDiscount ? 'grid-cols-[1fr_60px_60px_100px_100px_100px_1fr_32px]' : 'grid-cols-[1fr_60px_60px_100px_100px_1fr_32px]'} gap-2 items-center px-3 py-1.5 text-xs border-b last:border-b-0`}>
                    <span className="font-mono font-medium">{item.product_variant_name}</span>
                    <span className="text-right">
                      {isDetailEditable('ordered_qty') ? (
                        <Input type="number" className="h-7 w-14 text-xs text-right"
                          value={rowChanges.ordered_qty ?? String(item.ordered_qty)}
                          onChange={e => setDetailField(item.id, 'ordered_qty', e.target.value)} />
                      ) : item.ordered_qty}
                    </span>
                    <span className="text-right">
                      {isDetailEditable('received_qty') ? (
                        <Input type="number" className="h-7 w-14 text-xs text-right"
                          value={rowChanges.received_qty ?? String(item.received_qty ?? '')}
                          onChange={e => setDetailField(item.id, 'received_qty', e.target.value)} />
                      ) : (item.received_qty ?? '—')}
                    </span>
                    <span className="text-right">
                      {isDetailEditable('unit_price_foreign') ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-muted-foreground">{getCurrencySymbol(po.currency)}</span>
                          <Input type="number" step="0.001" className="h-7 w-20 text-xs text-right"
                            value={rowChanges.unit_price_foreign ?? String(item.unit_price_foreign ?? '')}
                            onChange={e => {
                              setDetailField(item.id, 'unit_price_foreign', e.target.value)
                              if (hasDiscount) {
                                setDetailField(item.id, 'discounted_unit_price_foreign', e.target.value)
                              }
                            }} />
                        </div>
                      ) : (item.unit_price_foreign != null ? `${getCurrencySymbol(po.currency)} ${formatForeignAmount(item.unit_price_foreign)}` : '—')}
                    </span>
                    {hasDiscount && (
                    <span className="text-right">
                      {isDetailEditable('discounted_unit_price_foreign') ? (
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-muted-foreground">{getCurrencySymbol(po.currency)}</span>
                          <Input type="number" step="0.001" className="h-7 w-20 text-xs text-right"
                            value={rowChanges.discounted_unit_price_foreign ?? String(item.discounted_unit_price_foreign ?? '')}
                            onChange={e => setDetailField(item.id, 'discounted_unit_price_foreign', e.target.value)} />
                        </div>
                      ) : (item.discounted_unit_price_foreign != null ? `${getCurrencySymbol(po.currency)} ${formatForeignAmount(item.discounted_unit_price_foreign)}` : '—')}
                    </span>
                    )}
                    <span className="text-right font-medium">
                      {(() => {
                        if (editMode) {
                          const effectivePrice = hasDiscount
                            ? Number(rowChanges.discounted_unit_price_foreign ?? item.discounted_unit_price_foreign ?? item.unit_price_foreign ?? 0)
                            : Number(rowChanges.unit_price_foreign ?? item.unit_price_foreign ?? 0)
                          const effectiveQty = Number(rowChanges.ordered_qty ?? item.ordered_qty ?? 0)
                          const rate = Number(po.exchange_rate ?? 0)
                          const live = Math.round(effectivePrice * effectiveQty * rate)
                          return live > 0 ? formatIDR(live) : '—'
                        }
                        if (hasDiscount) {
                          return item.discounted_total_price_base != null ? formatIDR(item.discounted_total_price_base) : '—'
                        }
                        return item.total_price_base != null
                          ? formatIDR(item.total_price_base)
                          : item.discounted_total_price_base != null
                            ? formatIDR(item.discounted_total_price_base)
                            : '—'
                      })()}
                    </span>
                    {showRemarks ? (
                      <Input className="h-7 text-xs" placeholder="Remarks..."
                        value={rowChanges.remarks ?? String(item.remarks ?? '')}
                        onChange={e => setDetailField(item.id, 'remarks', e.target.value)} />
                    ) : <span />}
                    {editMode && canAddDeleteItems ? (
                      <Button type="button" size="icon" variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => deleteExistingItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : <span />}
                  </div>
                )
              })}
              {editMode && canAddDeleteItems && group.newItemsList.map(n => (
                <div key={n._tempId} className={`grid ${hasDiscount ? 'grid-cols-[1fr_60px_60px_100px_100px_100px_1fr_32px]' : 'grid-cols-[1fr_60px_60px_100px_100px_1fr_32px]'} gap-2 items-center px-3 py-1.5 text-xs border-b last:border-b-0`}>
                  <VariantSearchSelect
                    value={n.product_variant_id}
                    selectedLabel={n.product_variant_label}
                    onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl) => {
                      updateNewItem(n._tempId, 'product_variant_id', id)
                      updateNewItem(n._tempId, 'product_variant_label', label)
                      updateNewItem(n._tempId, 'product_id', productId)
                      updateNewItem(n._tempId, 'product_name', productName)
                      updateNewItem(n._tempId, 'product_supplier_link', productSupplierLink ?? '')
                      updateNewItem(n._tempId, 'product_photo_url', productPhotoUrl ?? '')
                    }}
                    placeholder="Select variant"
                  />
                  <Input type="number" className="h-7 w-14 text-xs text-right"
                    value={n.ordered_qty}
                    onChange={e => updateNewItem(n._tempId, 'ordered_qty', e.target.value)} />
                  <span />
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-muted-foreground">{getCurrencySymbol(po.currency)}</span>
                    <Input type="number" step="0.001" className="h-7 w-20 text-xs text-right"
                      value={n.unit_price_foreign}
                      onChange={e => {
                        updateNewItem(n._tempId, 'unit_price_foreign', e.target.value)
                        if (hasDiscount) {
                          updateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value)
                        }
                      }} />
                  </div>
                  {hasDiscount && (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-muted-foreground">{getCurrencySymbol(po.currency)}</span>
                    <Input type="number" step="0.001" className="h-7 w-20 text-xs text-right"
                      value={n.discounted_unit_price_foreign}
                      onChange={e => updateNewItem(n._tempId, 'discounted_unit_price_foreign', e.target.value)} />
                  </div>
                  )}
                  <span />
                  <span />
                  <Button type="button" size="icon" variant="ghost"
                    className="h-7 w-7 text-red-500 hover:text-red-600"
                    onClick={() => removeNewItem(n._tempId)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {/* Cost Analysis toggle */}
              {group.existingItems.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleCostAnalysis(group.groupKey)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border-t"
                  >
                    <ChevronRight className={cn('h-3 w-3 transition-transform', expandedCostAnalysis.has(group.groupKey) && 'rotate-90')} />
                    Cost Analysis
                  </button>

                  {expandedCostAnalysis.has(group.groupKey) && (
                    <div className="border-t bg-muted/10">
                      {/* Column headers */}
                      <div className={`grid ${cogsRatioForecast != null ? 'grid-cols-[1fr_110px_110px_110px_120px_130px]' : 'grid-cols-[1fr_110px_110px_110px_120px]'} gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b`}>
                        <span>Variant</span>
                        <span className="text-right">Unit IDR</span>
                        <span className="text-right">Freight/unit</span>
                        <span className="text-right">Commission/unit</span>
                        <span className="text-right font-semibold">Total Cost/unit</span>
                        {cogsRatioForecast != null && <span className="text-right">COGS Forecast/unit</span>}
                      </div>
                      {/* Data rows */}
                      {group.existingItems.map(item => {
                        const unitPriceIdr = Math.round(Number(item.unit_price_foreign ?? 0) * poExchangeRate)
                        const totalCostPerUnit = unitPriceIdr + freightPerUnit + commissionPerUnit
                        const cogsForecastPerUnit = cogsRatioForecast != null
                          ? Math.round(unitPriceIdr * (1 + cogsRatioForecast / 100))
                          : null
                        return (
                          <div
                            key={`cost-${item.id}`}
                            className={`grid ${cogsRatioForecast != null ? 'grid-cols-[1fr_110px_110px_110px_120px_130px]' : 'grid-cols-[1fr_110px_110px_110px_120px]'} gap-2 px-3 py-1.5 text-xs border-b last:border-b-0`}
                          >
                            <span className="font-mono text-muted-foreground truncate">{item.product_variant_name}</span>
                            <span className="text-right">{unitPriceIdr > 0 ? formatIDR(unitPriceIdr) : '—'}</span>
                            <span className="text-right">{freightPerUnit > 0 ? formatIDR(freightPerUnit) : '—'}</span>
                            <span className="text-right">{commissionPerUnit > 0 ? formatIDR(commissionPerUnit) : '—'}</span>
                            <span className="text-right font-semibold">{totalCostPerUnit > 0 ? formatIDR(totalCostPerUnit) : '—'}</span>
                            {cogsForecastPerUnit != null && (
                              <span className="text-right font-semibold text-amber-600">{formatIDR(cogsForecastPerUnit)}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })})()}
      </div>

      {/* Section 4 — Order Summary + Status History */}
      <div className="grid grid-cols-2 gap-6">
        {/* Order Summary card */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-base font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Ordered</span>
              <span className="font-semibold">{po.total_ordered_qty} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Received</span>
              <span className="font-semibold">{po.total_received_qty} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Line Items</span>
              <span className="font-semibold">{po.order_details?.length ?? 0} SKUs</span>
            </div>
            {po.cbm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CBM</span>
                <span className="font-semibold">{po.cbm} m³</span>
              </div>
            )}
          </div>
        </div>
        {/* Status History card */}
        {po.status_history && po.status_history.length > 0 && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-base font-semibold mb-4">Status History</h2>
            <div className="space-y-4">
              {po.status_history.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1 shrink-0" />
                    {i < po.status_history.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant[entry.to_status]}>{entry.to_status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.changed_by_name ?? 'System'} · {formatDate(entry.cdate)}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {po.next_status && (
        <StatusAdvanceModal
          open={showAdvanceModal}
          onClose={() => setShowAdvanceModal(false)}
          po={po}
          targetStatus={po.next_status}
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
            <SelectTrigger className="h-7 text-xs">
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
