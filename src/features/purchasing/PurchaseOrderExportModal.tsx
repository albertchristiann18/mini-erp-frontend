import { Suspense, lazy } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import type { PurchaseOrder, PurchaseOrderDetail } from '../../types/purchasing'

const PDFContent = lazy(() => import('./PurchaseOrderExportPDF'))

interface Props {
  open: boolean
  onClose: () => void
  po: PurchaseOrder
}

export function PurchaseOrderExportModal({ open, onClose, po }: Props) {
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Export PDF — {po.purchase_order_number}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {open && (
            <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Generating PDF...</div>}>
              <PDFContent po={po} onDownload={onClose} />
            </Suspense>
          )}
        </div>
        <DialogFooter className="px-6 py-3 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export type { PurchaseOrder, PurchaseOrderDetail }
