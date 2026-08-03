/**
 * AddItemModal — multi-row item picker for PurchaseOrderDetailPage.
 * Presentational: receives stockMap/currency from hook; emits validated items via onAdd.
 */
import { useState, useEffect, useMemo } from 'react'
import { Plus, X as XIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { VariantSearchSelect } from '../VariantSearchSelect'
import { cn } from '../../../lib/utils'
import { getCurrencySymbol } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import type { ModalDraftItem } from '../../../hooks/purchasing/purchaseOrderDetailHelpers'
import type { ReplenishmentItem } from '../../../types/purchasing'

type RowDraft = ModalDraftItem & { tempId: string }

function makeEmptyRow(): RowDraft {
  return {
    tempId: `r-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    product_variant_id: '', product_variant_label: '',
    product_id: '', product_name: '',
    product_supplier_link: null, product_photo_url: null,
    ordered_qty: '1', unit_price_foreign: '', discounted_unit_price_foreign: '',
  }
}

// ─── AddItemRow ───────────────────────────────────────────────────────────────

type QuickCreatedVariant = {
  id: string; label: string; productId: string; productName: string
  productSupplierLink: string | null; productPhotoUrl: string | null
  lastUnitPriceForeign: string | null; lastCurrency: string | null
  lastDiscountedUnitPriceForeign: string | null
}

function AddItemRow({
  row, index, stockMap, avgWindow, currency, hasDiscount, showAll, supplierId,
  allExcluded, onUpdate, onRemove, canRemove, onQuickCreated,
}: {
  row: RowDraft; index: number
  stockMap: Map<string, ReplenishmentItem>; avgWindow: 7 | 14 | 30
  currency: string; hasDiscount: boolean; showAll: boolean; supplierId?: string
  allExcluded: Set<string>
  onUpdate: (patch: Partial<RowDraft>) => void; onRemove: () => void; canRemove: boolean
  onQuickCreated?: (variants: QuickCreatedVariant[]) => void
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
            value={row.product_variant_id} selectedLabel={row.product_variant_label}
            excludeVariantIds={rowExcluded} supplierId={showAll ? undefined : supplierId}
            onSelect={(id, label, productId, productName, productSupplierLink, productPhotoUrl, lastUnitPriceForeign, lastCurrency, lastDiscountedUnitPriceForeign) => {
              const autoFill = lastUnitPriceForeign && lastCurrency && lastCurrency === currency && parseFloat(lastUnitPriceForeign) > 0
              const autoFillDiscount = hasDiscount && lastDiscountedUnitPriceForeign && lastCurrency === currency && parseFloat(lastDiscountedUnitPriceForeign) > 0
              onUpdate({
                product_variant_id: id, product_variant_label: label,
                product_id: productId, product_name: productName,
                product_supplier_link: productSupplierLink ?? null, product_photo_url: productPhotoUrl ?? null,
                ...(autoFill ? { unit_price_foreign: lastUnitPriceForeign! } : {}),
                ...(autoFillDiscount ? { discounted_unit_price_foreign: lastDiscountedUnitPriceForeign! } : {}),
              })
            }}
            onQuickCreated={onQuickCreated} placeholder="Search variant..."
          />
          {liveStats && (
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              SOH {liveSoh} · Inc {liveIncoming} · {avg > 0 ? `${avg.toFixed(1)}/d` : '—'} · DOI {doi !== null ? `${doi}d` : '∞'} → {doiAfter !== null ? `${doiAfter}d` : (ordQty > 0 ? '∞' : '—')}
            </p>
          )}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0 mt-1">
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 pl-5">
        <div className="w-20 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">Qty <span className="text-red-500">*</span></p>
          <Input type="number" min="1" className="h-7 text-xs" value={row.ordered_qty} onChange={e => onUpdate({ ordered_qty: e.target.value })} />
        </div>
        <div className="w-28 shrink-0">
          <p className="text-[10px] text-muted-foreground mb-0.5">Unit Price ({getCurrencySymbol(currency)})</p>
          <Input type="number" step="0.001" className="h-7 text-xs" value={row.unit_price_foreign} onChange={e => onUpdate({ unit_price_foreign: e.target.value })} />
        </div>
        {hasDiscount && (
          <div className="w-28 shrink-0">
            <p className="text-[10px] text-muted-foreground mb-0.5">Disc. Price ({getCurrencySymbol(currency)})</p>
            <Input type="number" step="0.001" className="h-7 text-xs" value={row.discounted_unit_price_foreign} onChange={e => onUpdate({ discounted_unit_price_foreign: e.target.value })} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AddItemModal ─────────────────────────────────────────────────────────────

interface AddItemModalProps {
  open: boolean; onClose: () => void; onAdd: (items: ModalDraftItem[]) => void
  hasDiscount: boolean; stockMap: Map<string, ReplenishmentItem>
  avgWindow: 7 | 14 | 30; currency: string; excludeVariantIds: Set<string>; supplierId?: string
}

export function AddItemModal({
  open, onClose, onAdd, hasDiscount, stockMap, avgWindow, currency, excludeVariantIds, supplierId,
}: AddItemModalProps) {
  const [rows, setRows] = useState<RowDraft[]>([makeEmptyRow()])
  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkQty, setBulkQty] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([makeEmptyRow()]); setBulkPrice(''); setBulkQty(''); setShowAll(false); setError('')
    }
  }, [open])

  const allExcluded = useMemo(() => {
    const combined = new Set(excludeVariantIds)
    for (const r of rows) if (r.product_variant_id) combined.add(r.product_variant_id)
    return combined
  }, [excludeVariantIds, rows])

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()])
  const removeRow = (tempId: string) => setRows(prev => prev.length > 1 ? prev.filter(r => r.tempId !== tempId) : prev)
  const updateRow = (tempId: string, patch: Partial<RowDraft>) =>
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, ...patch } : r))

  const handleQuickCreated = (tempId: string, variants: QuickCreatedVariant[]) => {
    if (variants.length === 0) return
    const first = variants[0]
    const autoFillFirst = first.lastUnitPriceForeign && first.lastCurrency === currency && parseFloat(first.lastUnitPriceForeign) > 0
    const autoFillDiscFirst = hasDiscount && first.lastDiscountedUnitPriceForeign && parseFloat(first.lastDiscountedUnitPriceForeign) > 0
    updateRow(tempId, {
      product_variant_id: first.id, product_variant_label: first.label,
      product_id: first.productId, product_name: first.productName,
      product_supplier_link: first.productSupplierLink, product_photo_url: first.productPhotoUrl,
      ...(autoFillFirst ? { unit_price_foreign: first.lastUnitPriceForeign! } : {}),
      ...(autoFillDiscFirst ? { discounted_unit_price_foreign: first.lastDiscountedUnitPriceForeign! } : {}),
    })
    const rest = variants.slice(1)
    if (rest.length > 0) {
      setRows(prev => {
        const newRows = rest.map(v => {
          const autoFill = v.lastUnitPriceForeign && v.lastCurrency === currency && parseFloat(v.lastUnitPriceForeign) > 0
          const autoFillDisc = hasDiscount && v.lastDiscountedUnitPriceForeign && parseFloat(v.lastDiscountedUnitPriceForeign) > 0
          return { ...makeEmptyRow(), product_variant_id: v.id, product_variant_label: v.label,
            product_id: v.productId, product_name: v.productName,
            product_supplier_link: v.productSupplierLink, product_photo_url: v.productPhotoUrl,
            ...(autoFill ? { unit_price_foreign: v.lastUnitPriceForeign! } : {}),
            ...(autoFillDisc ? { discounted_unit_price_foreign: v.lastDiscountedUnitPriceForeign! } : {}),
          }
        })
        const idx = prev.findIndex(r => r.tempId === tempId)
        if (idx === -1) return [...prev, ...newRows]
        return [...prev.slice(0, idx + 1), ...newRows, ...prev.slice(idx + 1)]
      })
    }
  }

  const handleBulkPrice = (val: string) => {
    setBulkPrice(val)
    setRows(prev => prev.map(r => ({ ...r, unit_price_foreign: val, ...(hasDiscount ? { discounted_unit_price_foreign: val } : {}) })))
  }
  const handleBulkQty = (val: string) => {
    setBulkQty(val)
    setRows(prev => prev.map(r => ({ ...r, ordered_qty: val })))
  }
  const handleConfirm = () => {
    const valid = rows.filter(r => r.product_variant_id && Number(r.ordered_qty) > 0)
    if (valid.length === 0) { setError('Add at least one item with a variant and quantity.'); return }
    onAdd(valid.map(r => ({
      product_variant_id: r.product_variant_id, product_variant_label: r.product_variant_label,
      product_id: r.product_id, product_name: r.product_name,
      product_supplier_link: r.product_supplier_link, product_photo_url: r.product_photo_url,
      ordered_qty: r.ordered_qty, unit_price_foreign: r.unit_price_foreign,
      discounted_unit_price_foreign: r.discounted_unit_price_foreign,
    })))
    onClose()
  }

  const validCount = rows.filter(r => r.product_variant_id && Number(r.ordered_qty) > 0).length

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-row items-center justify-between pr-8">
          <DialogTitle>Add Items</DialogTitle>
          {supplierId && (
            <button type="button" onClick={() => setShowAll(prev => !prev)}
              className={cn('text-xs px-2 py-1 rounded border', showAll ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
              {showAll ? 'Filtered off' : 'Filter by supplier'}
            </button>
          )}
        </DialogHeader>
        <div className="space-y-3 py-2 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">Bulk unit price ({getCurrencySymbol(currency)})</label>
              <Input type="number" step="0.001" className="h-7 text-xs w-36" placeholder="Apply to all rows" value={bulkPrice} onChange={e => handleBulkPrice(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">Bulk qty</label>
              <Input type="number" min="1" step="1" className="h-7 text-xs w-24" placeholder="Apply to all rows" value={bulkQty} onChange={e => handleBulkQty(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2 pr-1">
            {rows.map((row, idx) => (
              <AddItemRow key={row.tempId} row={row} index={idx} stockMap={stockMap} avgWindow={avgWindow}
                currency={currency} hasDiscount={hasDiscount} showAll={showAll} supplierId={supplierId}
                allExcluded={allExcluded} onUpdate={patch => updateRow(row.tempId, patch)}
                onRemove={() => removeRow(row.tempId)} canRemove={rows.length > 1}
                onQuickCreated={variants => handleQuickCreated(row.tempId, variants)} />
            ))}
            <button type="button" onClick={addRow} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
              <Plus className="h-3 w-3" /> Add row
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={rows.every(r => !r.product_variant_id)}>
            Add {validCount || ''} item{validCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
