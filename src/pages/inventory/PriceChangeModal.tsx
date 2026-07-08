import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useUpdateVariantPrice } from '../../hooks/api/useInventory'
import { toast } from '../../lib/toast'
import type { Product, ProductVariant } from '../../types/inventory'

interface Props {
  open: boolean
  onClose: () => void
  product: Product
}

export function PriceChangeModal({ open, onClose, product }: Props) {
  const variants: ProductVariant[] = product.variants ?? []
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.map(v => [v.id, String(v.base_price)]))
  )
  const mutation = useUpdateVariantPrice()
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setPrices(Object.fromEntries(variants.map(v => [v.id, String(v.base_price)])))
    onClose()
  }

  const handleSave = async () => {
    setSaving(true)
    let anyError = false
    for (const v of variants) {
      const raw = prices[v.id] ?? ''
      const parsed = parseInt(raw, 10)
      if (isNaN(parsed) || parsed < 0) {
        toast.error(`Invalid price for ${v.name}`)
        anyError = true
        continue
      }
      if (parsed === v.base_price) continue
      try {
        await mutation.mutateAsync({ productId: product.id, variantId: v.id, basePrice: parsed })
      } catch {
        toast.error(`Failed to update price for ${v.name}`)
        anyError = true
      }
    }
    setSaving(false)
    if (!anyError) {
      toast.success('Prices updated')
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Prices — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {variants.length === 0 && (
            <p className="text-sm text-muted-foreground">No variants</p>
          )}
          {variants.map(v => (
            <div key={v.id} className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</p>
              </div>
              <div className="w-40">
                <Input
                  type="number"
                  min={0}
                  value={prices[v.id] ?? ''}
                  onChange={e => setPrices(prev => ({ ...prev, [v.id]: e.target.value }))}
                  placeholder="Price (IDR)"
                />
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Prices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
