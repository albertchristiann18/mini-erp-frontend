/**
 * BulkEditModal — presentational modal for bulk-staging stock adjustments.
 *
 * Owns: local type/qty/showVariants state; renders the dialog with a
 * collapsible variant list and preview arrows.
 */
import { useState } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { toast } from '../../../lib/toast'
import type { ProductVariantStock } from '../../../types/inventory'
import { type AdjustType, computePreview, formatAdjustment } from '../../../hooks/inventory/stockHelpers'

export interface BulkEditModalProps {
  open: boolean
  onClose: () => void
  selectedVariants: ProductVariantStock[]
  onApply: (type: AdjustType, qty: number) => void
}

export function BulkEditModal({ open, onClose, selectedVariants, onApply }: BulkEditModalProps) {
  const [type, setType] = useState<AdjustType>('add')
  const [qty, setQty] = useState('')
  const [showVariants, setShowVariants] = useState(false)

  const handleApply = () => {
    const parsed = parseInt(qty)
    if (isNaN(parsed) || parsed < 0) { toast.error('Enter a valid quantity'); return }
    onApply(type, parsed)
    setQty('')
    onClose()
  }

  const previewLabel = formatAdjustment(type, qty || 0, true)

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Stock Edit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Selected count toggle */}
          <button
            type="button"
            onClick={() => setShowVariants(v => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-left"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{showVariants ? 'Hide ▲' : 'Show ▼'}</span>
          </button>

          {showVariants && (
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y text-sm">
              {selectedVariants.map(v => {
                const parsed = parseInt(qty)
                const hasPreview = qty !== '' && !isNaN(parsed)
                const newQty = hasPreview ? computePreview(v.physical_qty, type, parsed) : null
                return (
                  <div key={v.id} className="flex items-center justify-between px-3 py-1.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{v.product_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{v.physical_qty}</span>
                      {newQty !== null && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className={`font-semibold ${newQty !== v.physical_qty ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                            {newQty}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Adjustment type + qty */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Adjustment Type</label>
            <div className="flex gap-2">
              {(['add', 'min', 'set'] as AdjustType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-muted'
                  }`}
                >
                  {t === 'add' ? 'Add' : t === 'min' ? 'Minus' : 'Set'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min={0}
              placeholder="Enter quantity"
              value={qty}
              onChange={e => setQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!qty || isNaN(parseInt(qty))}>
            Stage {previewLabel} for {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
