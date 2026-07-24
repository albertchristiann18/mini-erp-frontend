import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePurchaseOrder, useUpdatePurchaseOrder, useCreatePurchaseOrder, useReplenishment } from '../../hooks/api/usePurchasing'
import { useWarehouses, useSuppliers, useUploadAnyVariantPhoto } from '../../hooks/api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { usePurchaseOrderDetail } from '../../hooks/purchasing/usePurchaseOrderDetail'
import { getCurrencySymbol, formatForeignAmount } from '../../hooks/purchasing/purchaseOrderDetailHelpers'
import { PurchaseOrderExportModal } from './PurchaseOrderExportModal'
import { StatusAdvanceModal } from './StatusAdvanceModal'
import { SupplierFormModal } from './SupplierFormModal'
import { SourcingImportWizard } from './SourcingImportWizard'
import { AddItemModal, ValidationModal, OrderItemsTable, PoFinancialSidebar, EditableInfoItem, HEADER_FIELD_CONFIG } from './PurchaseOrderDetail'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { ArrowLeft, FileDown, Pencil, Save, Plus, Upload, X as XIcon } from 'lucide-react'
import { cn, formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
import type { POStatus, ReplenishmentItem } from '../../types/purchasing'
import type { BadgeProps } from '../../components/ui/badge'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDecimalUnit(val: string | number | null | undefined, unit?: string): string {
  if (val == null || val === '') return '—'
  const formatted = Number(val).toLocaleString('id-ID', { maximumFractionDigits: 3 })
  return unit ? `${formatted} ${unit}` : formatted
}

const statusVariant: Record<POStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary', ORDERED: 'info', SHIPPED: 'warning',
  DELIVERED: 'success', COMPLETED: 'success', CANCELLED: 'destructive',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isCreating = id === 'new'
  const { data: po, isLoading } = usePurchaseOrder(isCreating ? '' : id!)
  const { user } = useAuth()
  const createMutation = useCreatePurchaseOrder()
  const updateMutation = useUpdatePurchaseOrder()
  const { data: warehouseData } = useWarehouses()
  const warehouses = warehouseData?.results ?? []
  const { data: suppliersData } = useSuppliers({ active_only: 'true' })
  const suppliers = suppliersData?.results ?? []
  const { data: replenishData } = useReplenishment()
  const stockMap = useMemo<Map<string, ReplenishmentItem>>(() => {
    const m = new Map<string, ReplenishmentItem>()
    for (const item of replenishData?.results ?? []) m.set(item.variant_id, item)
    return m
  }, [replenishData])
  const uploadPhotoMutation = useUploadAnyVariantPhoto()

  const vm = usePurchaseOrderDetail({
    po, isCreating, stockMap,
    createMutateAsync: createMutation.mutateAsync,
    updateMutateAsync: updateMutation.mutateAsync,
  })

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [showAdvanceModal, setShowAdvanceModal] = useState(false)
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false)
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [variantPhotoOverrides, setVariantPhotoOverrides] = useState<Record<string, string>>({})
  const [uploadingVariantPhoto, setUploadingVariantPhoto] = useState<Record<string, boolean>>({})

  const handleVariantPhotoUpload = async (variantId: string, productId: string, file: File) => {
    setUploadingVariantPhoto(prev => ({ ...prev, [variantId]: true }))
    try {
      const r = await uploadPhotoMutation.mutateAsync({ productId, variantId, image: file })
      setVariantPhotoOverrides(prev => ({ ...prev, [variantId]: r.photo_url }))
    } catch { toast.error('Failed to upload photo') }
    finally { setUploadingVariantPhoto(prev => ({ ...prev, [variantId]: false })) }
  }

  if (!isCreating && isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!isCreating && !po) return <div className="p-8 text-center text-muted-foreground">Purchase order not found</div>

  const canAddDeleteItems = isCreating || po?.status === 'DRAFT' || po?.status === 'ORDERED'
  const isEditable = (field: string) => isCreating || (po?.editable_fields?.header?.includes(field) ?? false)
  const currSymbol = getCurrencySymbol(po?.currency ?? String(vm.headerValues.currency ?? ''))
  const attachments = isCreating ? [] : [
    { label: 'PO Invoice', field: 'purchase_order_invoice_file', url: po!.purchase_order_invoice_file },
    { label: 'Delivery Order', field: 'delivery_order_file', url: po!.delivery_order_file },
    { label: 'DO Invoice', field: 'delivery_order_invoice_file', url: po!.delivery_order_invoice_file },
    { label: 'Packing List', field: 'packing_list_file', url: po!.packing_list_file },
  ]
  // Computed sidebar values for creating mode
  const estGoodsForeign = vm.newItems.reduce((s, n) => { const p = vm.hasDiscount ? (Number(n.discounted_unit_price_foreign) || Number(n.unit_price_foreign) || 0) : (Number(n.unit_price_foreign) || 0); return s + p * (Number(n.ordered_qty) || 0) }, 0)
  const estGoods = estGoodsForeign * vm.poExchangeRate
  const commPct = Number(vm.headerValues.commission_fee_pct) || 0
  const estCommission = Math.round(estGoodsForeign * (commPct / 100) * vm.poExchangeRate)
  const estFreight = Math.round((Number(vm.headerValues.forecast_cbm) || 0) * (Number(vm.headerValues.forecast_shipping_fee_per_cbm) || 0))
  const estDelivery = Math.round((Number(vm.headerValues.delivery_fee) || 0) * vm.poExchangeRate)

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/purchasing/orders')}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            {isCreating ? <h1 className="text-2xl font-bold">New Purchase Order</h1> : (
              <><div className="flex items-center gap-3"><h1 className="text-2xl font-bold font-mono">{po!.purchase_order_number}</h1><Badge variant={statusVariant[po!.status]}>{po!.status}</Badge></div>
                <p className="text-sm text-muted-foreground mt-1">Invoice {po!.invoice_date ? formatDate(po!.invoice_date) : '—'} · {po!.supplier_name ?? '—'}</p></>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isCreating ? (<><Button size="sm" variant="outline" onClick={() => navigate('/purchasing/orders')} disabled={createMutation.isPending}><XIcon className="h-4 w-4 mr-1" />Cancel</Button><Button size="sm" onClick={vm.handleCreate} disabled={createMutation.isPending}><Save className="h-4 w-4 mr-1" />{createMutation.isPending ? 'Creating...' : 'Create PO'}</Button></>) :
           vm.editMode ? (<><Button size="sm" variant="outline" onClick={vm.cancelEditMode} disabled={updateMutation.isPending}><XIcon className="h-4 w-4 mr-1" />Cancel</Button><Button size="sm" onClick={vm.handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />{updateMutation.isPending ? 'Saving...' : 'Save'}</Button></>) : (
            <>{!isCreating && <Button size="sm" variant="outline" onClick={() => setExportModalOpen(true)}><FileDown className="h-4 w-4 mr-1" />Export PDF</Button>}
              {user?.is_staff && po!.status !== 'CANCELLED' && <Button size="sm" variant="outline" onClick={vm.enterEditMode}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}
              {user?.is_staff && po!.next_status && <Button size="sm" onClick={() => setShowAdvanceModal(true)}>→ {po!.next_status}</Button>}</>
          )}
        </div>
      </div>

      {/* Section 1 — info card + sidebar */}
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-base font-semibold mb-3">Purchase Order Information</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Warehouse{isCreating && <span className="text-red-500 ml-0.5">*</span>}</p>
                {isCreating ? (<Select value={String(vm.headerValues.warehouse_id ?? '')} onValueChange={val => vm.setHeaderField('warehouse_id', val)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="warehouse-select-trigger"><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                  <SelectContent>{warehouses.map((w: { id: string; name: string }) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>) : <p className="text-sm font-semibold">{po?.warehouse_name ?? '—'}</p>}
              </div>
              {(isCreating || (vm.editMode && isEditable('supplier_name'))) ? (<div>
                <p className="text-xs text-muted-foreground mb-1">Supplier</p>
                <Select value={String(vm.headerValues.supplier_id ?? po?.supplier_id ?? '')} onValueChange={val => vm.setHeaderField('supplier_id', val === 'none' ? '' : val)}>
                  <SelectTrigger className="h-7 text-xs" data-testid="supplier-select-trigger"><SelectValue placeholder="No supplier" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">No supplier</SelectItem>
                    {suppliers.map((s: { id: string; name: string }) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    <div className="border-t mt-1 pt-1 px-1 pb-1"><button type="button" className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-primary hover:bg-accent rounded-sm cursor-pointer" onMouseDown={e => e.preventDefault()} onClick={() => setShowNewSupplierModal(true)}><Plus className="h-3 w-3" />New Supplier</button></div>
                  </SelectContent></Select></div>
              ) : <EditableInfoItem field="supplier_name" label="Supplier" value={po?.supplier_name} editMode={vm.editMode} editable={false} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />}
              {(['forwarder_name', 'shop_services', 'invoice_number', 'invoice_date', 'delivery_order_number', 'delivery_date', 'forecast_delivery_date'] as const).map(field => (
                <EditableInfoItem key={field} field={field} label={HEADER_FIELD_CONFIG[field].label}
                  value={['invoice_date', 'delivery_date', 'forecast_delivery_date'].includes(field) && po?.[field as keyof typeof po] ? formatDate(po![field as keyof typeof po] as string) : po?.[field as keyof typeof po] as string | null | undefined}
                  editMode={vm.editMode} editable={isEditable(field)} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              ))}
            </div>
            <div className="border-t pt-3 grid grid-cols-2 gap-x-6 gap-y-3">
              <EditableInfoItem field="currency" label="Currency" value={po?.currency} editMode={vm.editMode} editable={isEditable('currency')} headerValues={vm.headerValues} setHeaderField={vm.handleCurrencyChange} />
              <EditableInfoItem field="exchange_rate" label="Exchange Rate" value={po?.exchange_rate != null ? `Rp ${Number(po?.exchange_rate).toLocaleString('id-ID')}` : null} editMode={vm.editMode} editable={isEditable('exchange_rate')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <EditableInfoItem field="commission_fee_pct" label="Commission %" value={po?.commission_fee_pct != null ? `${po?.commission_fee_pct}%` : null} editMode={vm.editMode} editable={isEditable('commission_fee_pct')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <EditableInfoItem field="delivery_fee" label="Delivery Fee (RMB)" value={po?.delivery_fee != null ? `${currSymbol} ${formatForeignAmount(po?.delivery_fee)}` : null} editMode={vm.editMode} editable={isEditable('delivery_fee')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <div><p className="text-xs text-muted-foreground mb-1">Commission (IDR)</p><p className="text-sm font-semibold">{(() => { const val = vm.liveCommissionFee ?? po?.commission_fee; return val != null ? formatIDR(val) : '—' })()}</p></div>
              <EditableInfoItem field="weight" label="Weight (kg)" value={po?.weight != null ? formatDecimalUnit(po?.weight, 'kg') : null} editMode={vm.editMode} editable={isEditable('weight')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <EditableInfoItem field="cbm" label="CBM" value={po?.cbm != null ? `${formatDecimalUnit(po?.cbm)} m³ (actual)` : po?.forecast_cbm != null ? `${formatDecimalUnit(po?.forecast_cbm)} m³ (forecast)` : null} editMode={vm.editMode} editable={isEditable('cbm')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <EditableInfoItem field="shipping_fee_per_cbm" label="Shipping Fee / CBM" value={po?.shipping_fee_per_cbm != null ? formatIDR(po?.shipping_fee_per_cbm) : null} editMode={vm.editMode} editable={isEditable('shipping_fee_per_cbm')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              {(() => { const spCbm = Number(vm.headerValues.shipping_fee_per_cbm ?? po?.shipping_fee_per_cbm ?? 0); if (spCbm <= 0 || ['DELIVERED','COMPLETED','CANCELLED'].includes(po?.status ?? '')) return null; const n = (po?.order_details ?? []).filter(i => i.product_has_dimensions === false).length; if (n === 0) return null; return <div className="col-span-2 flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"><span>⚠</span><span>{n} item{n > 1 ? 's' : ''} have no product dimensions — shipping fee not allocated to those items.</span></div> })()}
              <EditableInfoItem field="forecast_cbm" label="Forecast CBM" value={po?.forecast_cbm != null ? formatDecimalUnit(po?.forecast_cbm, 'm3') : null} editMode={vm.editMode} editable={isEditable('forecast_cbm')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
              <EditableInfoItem field="forecast_shipping_fee_per_cbm" label="Forecast Shipping/CBM" value={po?.forecast_shipping_fee_per_cbm != null ? formatIDR(po?.forecast_shipping_fee_per_cbm) : null} editMode={vm.editMode} editable={isEditable('forecast_shipping_fee_per_cbm')} headerValues={vm.headerValues} setHeaderField={vm.setHeaderField} />
            </div>
          </div>
          {!isCreating && <div className="rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-3">Attachments</h2>
            <div className="grid grid-cols-4 gap-3">{attachments.map(({ label, field, url }) => {
              const isFileEditable = vm.editMode && (po?.editable_fields?.header?.includes(field) ?? false) && !(po?.status === 'COMPLETED' && !!url)
              const fileSelected = !!vm.headerValues[field]
              return (
                <div key={label} className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white', url || fileSelected ? 'bg-red-600' : 'bg-muted')}>PDF</div>
                  <div className="space-y-0.5"><p className={cn('text-xs font-semibold leading-tight', !url && !fileSelected && 'text-muted-foreground')}>{label}</p><p className="text-xs text-muted-foreground leading-tight">{fileSelected ? 'Ready' : url ? 'Uploaded' : 'Not uploaded'}</p></div>
                  <div className="flex flex-col gap-1 w-full">
                    {url && !fileSelected && <a href={url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="w-full text-xs h-7">View</Button></a>}
                    {isFileEditable && <label className="cursor-pointer w-full"><input type="file" className="hidden" accept="application/pdf,image/*" onChange={e => { const file = e.target.files?.[0]; if (file) vm.setHeaderField(field, file) }} /><Button size="sm" variant="outline" className="w-full text-xs h-7" asChild><span>{fileSelected ? '✓ Ready' : url ? 'Replace' : 'Upload'}</span></Button></label>}
                  </div>
                </div>
              )
            })}</div>
          </div>}
        </div>
        <PoFinancialSidebar po={po!} isCreating={isCreating} hasDiscount={vm.hasDiscount}
          liveCommissionFee={vm.liveCommissionFee} computedGoodsAmount={vm.computedGoodsAmount} deliveryFeeIdr={vm.deliveryFeeIdr}
          estGoods={estGoods} estGoodsForeign={estGoodsForeign} estCommission={estCommission}
          estFreight={estFreight} estDelivery={estDelivery} estTotal={Math.round(estGoods) + estCommission + estFreight + estDelivery}
          totalUnits={vm.newItems.reduce((s, n) => s + (Number(n.ordered_qty) || 0), 0)}
          totalSkus={vm.newItems.filter(n => n.product_variant_id).length}
          newItemsCurrencySymbol={getCurrencySymbol(String(vm.headerValues.currency ?? ''))} newItemsCurrency={String(vm.headerValues.currency ?? '')} />
      </div>

      {/* Notes */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold mb-3">Notes</h2>
        {vm.editMode ? <Textarea className="min-h-[80px] text-sm" placeholder="Add notes..." value={String(vm.headerValues['note'] ?? '')} onChange={e => vm.setHeaderField('note', e.target.value)} />
          : <p className="text-sm text-muted-foreground whitespace-pre-wrap">{(isCreating ? String(vm.headerValues.note ?? '') : po?.note) || 'No notes'}</p>}
      </div>

      {/* Order Items */}
      <div className="rounded-lg border bg-card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold">Order Items</h2>
          <div className="flex items-center gap-3">
            <div className="flex rounded-md border overflow-hidden text-xs h-6">
              {([7, 14, 30] as const).map(w => <button key={w} type="button" className={`px-2 ${vm.avgWindow === w ? 'bg-primary text-primary-foreground' : 'bg-background'}`} onClick={() => vm.setAvgWindow(w)}>{w}d</button>)}
            </div>
            {!isCreating && <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">Group by:</span>
              <Select value={vm.groupBy} onValueChange={vm.setGroupBy}>
                <SelectTrigger className="h-6 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="product">Product</SelectItem>
                  {vm.availableGroupKeys.map(k => <SelectItem key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</SelectItem>)}</SelectContent>
              </Select></div>}
            {!isCreating && vm.allGroupKeys.length > 0 && (
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => { if (vm.allCollapsed) vm.setCollapsedGroups(new Set()); else vm.setCollapsedGroups(new Set(vm.allGroupKeys)) }}>
                {vm.allCollapsed ? 'Expand all' : 'Collapse all'}</button>)}
            {vm.editMode && <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none"><input type="checkbox" checked={vm.hasDiscount} onChange={e => vm.setHasDiscount(e.target.checked)} className="h-3.5 w-3.5" />Has Discount</label>}
            {vm.editMode && canAddDeleteItems && <Button type="button" variant="outline" size="sm" onClick={() => setShowImportWizard(true)} disabled={!vm.activeSupplierId} title={!vm.activeSupplierId ? 'Set a supplier on this PO first' : undefined}><Upload className="h-3 w-3 mr-1" />Import from Excel</Button>}
            {vm.editMode && canAddDeleteItems && <Button type="button" size="sm" variant="outline" onClick={() => setAddItemModalOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Item</Button>}
          </div>
        </div>
        <div className="overflow-x-auto">
          <OrderItemsTable po={po} isCreating={isCreating} editMode={vm.editMode} groupBy={vm.groupBy}
            hasDiscount={vm.hasDiscount} deletedDetailIds={vm.deletedDetailIds} newItems={vm.newItems}
            detailValues={vm.detailValues} collapsedGroups={vm.collapsedGroups} avgWindow={vm.avgWindow}
            stockMap={stockMap} poExchangeRate={vm.poExchangeRate} freightPerUnit={vm.freightPerUnit}
            commissionPerUnit={vm.commissionPerUnit} activeSupplierId={vm.activeSupplierId}
            canAddDeleteItems={canAddDeleteItems ?? false} variantPhotoOverrides={variantPhotoOverrides}
            uploadingVariantPhoto={uploadingVariantPhoto} getItemStockData={vm.getItemStockData}
            onToggleGroupCollapse={vm.toggleGroupCollapse} onSetDetailField={vm.setDetailField}
            onDeleteExistingItem={vm.deleteExistingItem} onRemoveNewItem={vm.removeNewItem}
            onUpdateNewItem={vm.updateNewItem} onVariantPhotoUpload={handleVariantPhotoUpload} />
        </div>
      </div>

      {/* Modals */}
      {!isCreating && po?.next_status && <StatusAdvanceModal open={showAdvanceModal} onClose={() => setShowAdvanceModal(false)} po={po!} targetStatus={po!.next_status} />}
      <AddItemModal open={addItemModalOpen} onClose={() => setAddItemModalOpen(false)} onAdd={vm.handleAddItemFromModal}
        hasDiscount={vm.hasDiscount} stockMap={stockMap} avgWindow={vm.avgWindow}
        currency={po?.currency ?? String(vm.headerValues.currency ?? '')} excludeVariantIds={vm.usedVariantIds} supplierId={vm.activeSupplierId} />
      {!isCreating && po && <PurchaseOrderExportModal open={exportModalOpen} onClose={() => setExportModalOpen(false)} po={po} />}
      <ValidationModal errors={vm.validationErrors} onClose={() => vm.setValidationErrors([])} title="Save Error" />
      <SupplierFormModal open={showNewSupplierModal} onClose={() => setShowNewSupplierModal(false)} onCreated={s => { vm.setHeaderField('supplier_id', s.id); setShowNewSupplierModal(false) }} />
      {!isCreating && po && <SourcingImportWizard open={showImportWizard} onClose={() => setShowImportWizard(false)} poId={po.id} supplierId={vm.activeSupplierId ?? ''} supplierName={suppliers?.find(s => s.id === vm.activeSupplierId)?.name ?? ''} />}
    </div>
  )
}
