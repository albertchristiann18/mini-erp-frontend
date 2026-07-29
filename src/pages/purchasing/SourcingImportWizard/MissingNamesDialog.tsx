import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import type { MissingProductName } from '../../../types/purchasing'

interface MissingNamesDialogProps {
  open: boolean
  missingProductNames: MissingProductName[]
  pendingNameOverrides: Record<string, string>
  onNameChange: (row: string, value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function MissingNamesDialog({
  open,
  missingProductNames,
  pendingNameOverrides,
  onNameChange,
  onCancel,
  onConfirm,
}: MissingNamesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Missing Product Names</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Some rows have no product name. Enter names below, or leave blank to skip those rows.
        </p>
        {missingProductNames.map((mpn) => (
          <div key={mpn.row} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14">Row {mpn.row}</span>
            <span className="text-xs flex-1 truncate">
              {(mpn.supplier_link ?? [mpn.dim1_value, mpn.dim2_value].filter(Boolean).join(' ')) || '(no identifier)'}
            </span>
            <Input
              className="h-7 w-40 text-xs"
              placeholder="Product name..."
              value={pendingNameOverrides[String(mpn.row)] ?? ''}
              onChange={(e) => onNameChange(String(mpn.row), e.target.value)}
            />
          </div>
        ))}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm & Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
