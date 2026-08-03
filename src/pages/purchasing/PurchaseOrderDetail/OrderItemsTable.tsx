/**
 * OrderItemsTable — the grouped order-items table for PurchaseOrderDetailPage.
 * Presentational: receives view-model values and action callbacks from the page/hook.
 */
import React, { useMemo } from 'react'
import { ChevronDown, ExternalLink, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { cn, formatIDR } from '../../../lib/utils'
import type { PurchaseOrder, PurchaseOrderDetail, ReplenishmentItem } from '../../../types/purchasing'
import { getCurrencySymbol, formatForeignAmount, doiAfterColor } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import type { ItemStockData, NewItem } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import { NewItemRow } from './NewItemRow'

// ─── Group type ──────────────────────────────────────────────────────────────

type DisplayGroup = {
  groupKey: string; productName: string
  productSupplierLink: string | null; productPhotoUrl: string | null
  existingItems: PurchaseOrderDetail[]; newItemsList: NewItem[]
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface OrderItemsTableProps {
  po: PurchaseOrder | undefined
  isCreating: boolean
  editMode: boolean
  groupBy: string
  hasDiscount: boolean
  deletedDetailIds: Set<string>
  newItems: NewItem[]
  detailValues: Record<string, Record<string, string>>
  collapsedGroups: Set<string>
  avgWindow: 7 | 14 | 30
  stockMap: Map<string, ReplenishmentItem>
  poExchangeRate: number
  freightPerUnit: number
  commissionPerUnit: number
  activeSupplierId: string | undefined
  canAddDeleteItems: boolean
  variantPhotoOverrides: Record<string, string>
  uploadingVariantPhoto: Record<string, boolean>
  getItemStockData: (item: PurchaseOrderDetail) => ItemStockData
  onToggleGroupCollapse: (key: string) => void
  onSetDetailField: (itemId: string, field: string, value: string) => void
  onDeleteExistingItem: (itemId: string) => void
  onRemoveNewItem: (_tempId: string) => void
  onUpdateNewItem: (_tempId: string, field: string, value: string) => void
  onVariantPhotoUpload: (variantId: string, productId: string, file: File) => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OrderItemsTable({
  po, isCreating, editMode, groupBy, hasDiscount, deletedDetailIds, newItems,
  detailValues, collapsedGroups, avgWindow, stockMap, poExchangeRate, freightPerUnit,
  commissionPerUnit, activeSupplierId, canAddDeleteItems, variantPhotoOverrides,
  uploadingVariantPhoto, getItemStockData, onToggleGroupCollapse, onSetDetailField,
  onDeleteExistingItem, onRemoveNewItem, onUpdateNewItem, onVariantPhotoUpload,
}: OrderItemsTableProps) {
  const currency = po?.currency ?? null
  const currSymbol = getCurrencySymbol(currency)

  const visibleDetails = isCreating
    ? []
    : (po?.order_details ?? []).filter(item => !deletedDetailIds.has(item.id))

  const groupMap = useMemo(() => {
    const map = new Map<string, DisplayGroup>()
    for (const item of visibleDetails) {
      let key: string, groupLabel: string, groupPhoto: string | null
      if (groupBy === 'product') { key = item.product_id || 'unknown'; groupLabel = item.product_name || 'Unknown Product'; groupPhoto = item.product_photo_url ?? null }
      else if (groupBy === 'flat') { key = item.id; groupLabel = item.product_variant_name || item.product_name || ''; groupPhoto = null }
      else { const dv = item.variant_values?.[groupBy] ?? 'Other'; key = `${item.product_id}_${dv}`; groupLabel = `${item.product_name} ${dv}`; groupPhoto = item.product_photo_url ?? null }
      if (!map.has(key)) map.set(key, { groupKey: key, productName: groupLabel, productSupplierLink: item.product_supplier_link, productPhotoUrl: groupPhoto, existingItems: [], newItemsList: [] })
      map.get(key)!.existingItems.push(item)
    }
    if (editMode && canAddDeleteItems) {
      for (const n of newItems) {
        const key = n.product_id || `new-${n._tempId}`
        if (!map.has(key)) map.set(key, { groupKey: key, productName: n.product_name || 'Unknown Product', productSupplierLink: n.product_supplier_link, productPhotoUrl: n.product_photo_url ?? null, existingItems: [], newItemsList: [] })
        map.get(key)!.newItemsList.push(n)
      }
    }
    for (const group of map.values()) {
      group.existingItems.sort((a, b) => {
        const aKeys = Object.keys(a.variant_values ?? {})
        const dim1Key = aKeys[0] ?? ''; const dim2Key = aKeys[1] ?? ''
        const cmp2 = String(a.variant_values?.[dim2Key] ?? '').localeCompare(String(b.variant_values?.[dim2Key] ?? ''))
        return cmp2 !== 0 ? cmp2 : String(a.variant_values?.[dim1Key] ?? '').localeCompare(String(b.variant_values?.[dim1Key] ?? ''))
      })
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [po?.order_details, groupBy, deletedDetailIds, editMode, canAddDeleteItems, newItems])

  const editableOrderDetail = po?.editable_fields?.order_detail ?? []
  const showRemarks = !isCreating && editMode && editableOrderDetail.includes('remarks')
  const isDetailEditable = (field: string) => editMode && (isCreating || editableOrderDetail.includes(field))

  return (
    <table className="w-full min-w-max text-xs border-collapse">
      <thead>
        <tr className="border-b bg-muted/30 text-muted-foreground">
          <th className="w-8" /><th className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[160px]">Variant</th>
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
      {Array.from(groupMap.values()).map(group => {
        const groupStockData = group.existingItems.map(item => getItemStockData(item))
        const sumSOH = groupStockData.reduce((s, d) => s + d.soh, 0)
        const sumIncoming = groupStockData.reduce((s, d) => s + d.incoming, 0)
        const sumUpcoming = groupStockData.reduce((s, d) => s + d.upcoming, 0)
        const sumAvg = groupStockData.reduce((s, d) => s + d.avg, 0)
        const groupDoi = sumAvg > 0 ? Math.round((sumSOH + sumIncoming) / sumAvg) : null
        const groupDoiAfter = sumAvg > 0 ? Math.round(sumUpcoming / sumAvg) : null
        const sumRecommended = groupStockData.reduce((s, d) => s + (d.recommendedQty ?? 0), 0)
        const hasAnyRec = groupStockData.some(d => d.recommendedQty !== null)
        const sumOrdered = group.existingItems.reduce((s, i) => s + i.ordered_qty, 0) + group.newItemsList.reduce((s, n) => s + Number(n.ordered_qty || 0), 0)
        const sumReceived = group.existingItems.reduce((s, i) => s + (i.received_qty ?? 0), 0)
        const sumTotalForeign = group.existingItems.reduce((s, i) => s + (hasDiscount ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0) : Number(i.unit_price_foreign ?? 0)) * i.ordered_qty, 0)
        const sumTotalIdr = group.existingItems.reduce((s, i) => s + (hasDiscount ? (i.discounted_total_price_base ?? i.total_price_base ?? 0) : (i.total_price_base ?? i.discounted_total_price_base ?? 0)), 0)
        const maxUnitForeign = group.existingItems.length > 0 ? Math.max(...group.existingItems.map(i => hasDiscount ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0) : Number(i.unit_price_foreign ?? 0))) : 0
        const maxUnitIdr = Math.round(maxUnitForeign * poExchangeRate)
        const maxCogsPerUnit = group.existingItems.length > 0 ? Math.max(...group.existingItems.map(i => {
          if (i.cogs_per_unit_idr != null) return i.cogs_per_unit_idr
          const unitF = hasDiscount ? Number(i.discounted_unit_price_foreign ?? i.unit_price_foreign ?? 0) : Number(i.unit_price_foreign ?? 0)
          return Math.round(unitF * poExchangeRate) + freightPerUnit + commissionPerUnit
        })) : 0
        const isCollapsed = collapsedGroups.has(group.groupKey)
        return (
          <tbody key={group.groupKey}>
            <tr className="bg-muted/40 border-b cursor-pointer hover:bg-muted/60 transition-colors font-semibold text-sm" onClick={() => onToggleGroupCollapse(group.groupKey)}>
              <td colSpan={2} className="px-3 py-2 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', isCollapsed && '-rotate-90')} />
                  {group.productPhotoUrl ? <img src={group.productPhotoUrl} alt={group.productName} className="h-6 w-6 rounded object-cover shrink-0 border border-border" /> : <div className="h-6 w-6 rounded bg-muted shrink-0" />}
                  <span className="font-bold text-foreground">{group.productName}</span>
                  {group.productSupplierLink && (
                    <a href={group.productSupplierLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-0.5 text-blue-500 hover:text-blue-600 text-xs shrink-0">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap font-medium text-violet-600">{hasAnyRec ? sumRecommended : '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{sumOrdered}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{sumReceived || '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{sumSOH}</td>
              <td className="px-3 py-2 whitespace-nowrap text-blue-600">{sumIncoming}</td>
              <td className="px-3 py-2 whitespace-nowrap">{sumUpcoming}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">{sumAvg > 0 ? `${sumAvg.toFixed(1)}/d` : '—'}</td>
              <td className={`px-3 py-2 whitespace-nowrap ${groupDoi !== null && groupDoi < 14 ? 'text-red-600' : groupDoi !== null && groupDoi <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>{groupDoi !== null ? `${groupDoi}d` : '—'}</td>
              <td className={`px-3 py-2 whitespace-nowrap ${doiAfterColor(groupDoiAfter)}`}>{groupDoiAfter !== null ? `${groupDoiAfter}d` : '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">{maxUnitForeign > 0 ? `${currSymbol} ${formatForeignAmount(maxUnitForeign)}` : '—'}</td>
              {hasDiscount && <td className="px-3 py-2" />}
              <td className="px-3 py-2 whitespace-nowrap text-muted-foreground font-normal">{maxUnitIdr > 0 ? formatIDR(maxUnitIdr) : '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{sumTotalForeign > 0 ? `${currSymbol} ${formatForeignAmount(sumTotalForeign)}` : '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{sumTotalIdr > 0 ? formatIDR(sumTotalIdr) : '—'}</td>
              <td className="px-3 py-2 whitespace-nowrap font-medium text-amber-700">{maxCogsPerUnit > 0 ? formatIDR(maxCogsPerUnit) : '—'}</td>
              <td className="px-3 py-2" />{editMode && canAddDeleteItems && <td />}
            </tr>
            {!isCollapsed && (
              <>
                {group.existingItems.map(item => {
                  const rowChanges = detailValues[item.id] ?? {}
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
                            <label className={`relative w-7 h-7 rounded border overflow-hidden shrink-0 cursor-pointer ${uploadingVariantPhoto[item.variant_id] ? 'opacity-50' : 'hover:opacity-80'}`}>
                              {variantPhotoOverrides[item.variant_id] || item.product_photo_url ? (
                                <img src={variantPhotoOverrides[item.variant_id] ?? item.product_photo_url ?? ''} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground"><ImagePlus className="w-3.5 h-3.5" /></div>
                              )}
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingVariantPhoto[item.variant_id]}
                                onChange={e => { const file = e.target.files?.[0]; if (file) onVariantPhotoUpload(item.variant_id, item.product_id, file); e.target.value = '' }} />
                            </label>
                            <div className="flex flex-col min-w-0"><span className="font-mono font-medium">{item.product_variant_name}</span>{item.sku_variant_code && <span className="text-[10px] text-muted-foreground font-mono leading-tight">{item.sku_variant_code}</span>}</div>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium text-violet-600">{recommendedQty !== null ? recommendedQty : '∞'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{isDetailEditable('ordered_qty') ? <Input type="number" className="h-7 w-14 text-xs" value={rowChanges.ordered_qty ?? String(item.ordered_qty)} onChange={e => onSetDetailField(item.id, 'ordered_qty', e.target.value)} /> : item.ordered_qty}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{isDetailEditable('received_qty') ? <Input type="number" className="h-7 w-14 text-xs" value={rowChanges.received_qty ?? String(item.received_qty ?? '')} onChange={e => onSetDetailField(item.id, 'received_qty', e.target.value)} /> : (item.received_qty ?? '—')}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{soh}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-blue-600">{incoming}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium">{upcoming}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{avg > 0 ? `${avg.toFixed(1)}/d` : '—'}{hasSnapshot && <span className="text-[10px] text-muted-foreground/50 ml-0.5">*</span>}</td>
                        <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doi !== null && doi < 14 ? 'text-red-600' : doi !== null && doi <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>{doi !== null ? `${doi}d` : '∞'}</td>
                        <td className={`px-3 py-1.5 whitespace-nowrap font-medium ${doiAfterColor(doiAfter)}`}>{doiAfter !== null ? `${doiAfter}d` : '∞'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{isDetailEditable('unit_price_foreign') ? (
                          <Input type="number" step="0.001" className="h-7 w-20 text-xs" value={rowChanges.unit_price_foreign ?? String(item.unit_price_foreign ?? '')}
                            onChange={e => { onSetDetailField(item.id, 'unit_price_foreign', e.target.value); if (hasDiscount) onSetDetailField(item.id, 'discounted_unit_price_foreign', e.target.value) }} />
                        ) : (item.unit_price_foreign != null ? `${currSymbol} ${formatForeignAmount(item.unit_price_foreign)}` : '—')}</td>
                        {hasDiscount && <td className="px-3 py-1.5 whitespace-nowrap">{isDetailEditable('discounted_unit_price_foreign') ? (
                          <Input type="number" step="0.001" className="h-7 w-20 text-xs" value={rowChanges.discounted_unit_price_foreign ?? String(item.discounted_unit_price_foreign ?? '')} onChange={e => onSetDetailField(item.id, 'discounted_unit_price_foreign', e.target.value)} />
                        ) : (item.discounted_unit_price_foreign != null ? `${currSymbol} ${formatForeignAmount(item.discounted_unit_price_foreign)}` : '—')}</td>}
                        <td className="px-3 py-1.5 whitespace-nowrap">{unitPriceIdr > 0 ? formatIDR(unitPriceIdr) : '—'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{totalForeign > 0 ? `${currSymbol} ${formatForeignAmount(totalForeign)}` : '—'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium">{totalIdr > 0 ? formatIDR(totalIdr) : '—'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap font-medium text-amber-700">{item.cogs_per_unit_idr != null ? formatIDR(item.cogs_per_unit_idr) : (cogsPerUnit > 0 ? formatIDR(cogsPerUnit) : '—')}</td>
                        <td className="px-3 py-1.5">{showRemarks ? <Input className="h-7 text-xs min-w-[80px]" placeholder="Remarks..." value={rowChanges.remarks ?? String(item.remarks ?? '')} onChange={e => onSetDetailField(item.id, 'remarks', e.target.value)} /> : <span className="text-muted-foreground">{item.remarks || ''}</span>}</td>
                        {editMode && canAddDeleteItems && <td className="px-2 py-1 w-8"><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDeleteExistingItem(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>}
                      </tr>
                    </React.Fragment>
                  )
                })}
                {editMode && canAddDeleteItems && group.newItemsList.map(n => (
                  <NewItemRow key={n._tempId} n={n} avgWindow={avgWindow} stockMap={stockMap}
                    poExchangeRate={poExchangeRate} freightPerUnit={freightPerUnit} commissionPerUnit={commissionPerUnit}
                    hasDiscount={hasDiscount} currency={currency} activeSupplierId={activeSupplierId}
                    onUpdateNewItem={onUpdateNewItem} onRemoveNewItem={onRemoveNewItem} />
                ))}
              </>
            )}
          </tbody>
        )
      })}
    </table>
  )
}
