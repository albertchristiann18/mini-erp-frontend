import { Check } from 'lucide-react'
import { DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import type { SkippedPoolItem } from '../../../types/purchasing'

interface ResultStepProps {
  totalAdded: number
  allSkipped: SkippedPoolItem[]
  onDone: () => void
}

export function ResultStep({ totalAdded, allSkipped, onDone }: ResultStepProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Check className="h-5 w-5 text-green-600" />
        <p className="text-lg font-semibold">{totalAdded} item{totalAdded !== 1 ? 's' : ''} added to PO</p>
      </div>
      {allSkipped.length > 0 && (
        <details className="mt-3">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            {allSkipped.length} item{allSkipped.length !== 1 ? 's' : ''} skipped
          </summary>
          <div className="mt-2 space-y-1">
            {allSkipped.map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {s.product_name || s.item_id}{s.variant_name ? ` — ${s.variant_name}` : ''}: {s.reason}
              </p>
            ))}
          </div>
        </details>
      )}
      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  )
}
