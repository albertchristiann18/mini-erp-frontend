import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import type { CreatedVariant } from '../../../hooks/purchasing/useQuickCreateProduct'

interface Props {
  open: boolean
  createdVariants: CreatedVariant[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onAddSelected: () => void
  onClose: () => void
}

export function PickerStep({ open, createdVariants, selectedIds, onToggle, onAddSelected, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Choose Variants to Add</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Select which variants to add as PO line items.</p>
        <div className="space-y-2 py-2">
          {createdVariants.map(v => (
            <label key={v.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(v.id)}
                onChange={() => onToggle(v.id)}
                className="h-4 w-4"
              />
              <span className="text-sm">{v.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onAddSelected}>
            Add Selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
