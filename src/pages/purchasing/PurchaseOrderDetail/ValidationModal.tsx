/**
 * ValidationModal — shows a list of validation/save errors as a dialog.
 * Presentational: receives errors array and onClose callback.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'

interface ValidationModalProps {
  errors: string[]
  onClose: () => void
  title?: string
}

export function ValidationModal({ errors, onClose, title }: ValidationModalProps) {
  if (errors.length === 0) return null
  return (
    <Dialog open={errors.length > 0} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? 'Validation Error'}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-600">
              <span className="shrink-0">•</span>
              <span>{e}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button size="sm" onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
