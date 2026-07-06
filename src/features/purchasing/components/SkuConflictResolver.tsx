import { Button } from '../../../components/ui/button'
import { DialogFooter } from '../../../components/ui/dialog'
import type { SKUConflict } from '../../../types/purchasing'

interface ConflictResolution {
  action: 'add_to_existing' | 'skip'
  product_id?: string
}

interface SkuConflictResolverProps {
  conflicts: SKUConflict[]
  resolutions: Record<string, ConflictResolution>
  onResolutionChange: (itemId: string, resolution: ConflictResolution) => void
  onConfirm: () => void
  isPending: boolean
}

export function SkuConflictResolver({ conflicts, resolutions, onResolutionChange, onConfirm, isPending }: SkuConflictResolverProps) {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        These variants have SKU codes that belong to existing products. Choose what to do with each.
      </p>
      {conflicts.map((conflict) => {
        const resolution = resolutions[conflict.item_id]
        return (
          <div key={conflict.item_id} className="border rounded p-3 space-y-1">
            <p className="text-sm font-mono font-medium">{conflict.variant_code}</p>
            <p className="text-xs text-muted-foreground">SKU: {conflict.sku_code} · belongs to: {conflict.existing_product_name}</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio"
                  checked={resolution?.action === 'add_to_existing'}
                  onChange={() => onResolutionChange(conflict.item_id, { action: 'add_to_existing', product_id: conflict.existing_product_id })} />
                Add to &ldquo;{conflict.existing_product_name}&rdquo;
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio"
                  checked={resolution?.action === 'skip'}
                  onChange={() => onResolutionChange(conflict.item_id, { action: 'skip' })} />
                Skip
              </label>
            </div>
          </div>
        )
      })}
      <DialogFooter>
        <Button disabled={isPending} onClick={onConfirm}>
          {isPending ? 'Saving...' : 'Confirm'}
        </Button>
      </DialogFooter>
    </>
  )
}
