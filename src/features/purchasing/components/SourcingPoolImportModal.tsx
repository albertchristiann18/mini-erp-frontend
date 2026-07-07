import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { toast } from '../../../lib/toast'
import { useDownloadSourcingPoolTemplate, usePreviewSourcingPool, useImportSourcingPool } from '../hooks/useSourcingPool'
import type { SourcingPoolPreviewResult, SourcingPoolPreviewRow } from '../../../types/purchasing'

interface SourcingPoolImportModalProps {
  open: boolean
  onClose: () => void
  supplierId: string
  supplierName: string
  onImportSuccess: (importedRows: SourcingPoolPreviewRow[]) => void
}

export function SourcingPoolImportModal({ open, onClose, supplierId, supplierName, onImportSuccess }: SourcingPoolImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewResult, setPreviewResult] = useState<SourcingPoolPreviewResult | null>(null)

  const downloadMutation = useDownloadSourcingPoolTemplate()
  const previewMutation = usePreviewSourcingPool()
  const importMutation = useImportSourcingPool()

  const handleClose = () => {
    setStep(1)
    setSelectedFile(null)
    setPreviewResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import from Excel — {supplierName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">Step 1 of 3: Download Template</p>
              <p className="text-sm">Download the Excel template, fill in your supplier's catalogue, then upload it here.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Columns: product_name, variant_name, category_code, unit_price,
                discounted_price (optional), qty_suggested (optional),
                supplier_link (optional), image_url (optional), notes (optional)
              </p>
              <Button onClick={() => downloadMutation.mutate(undefined, { onError: () => toast.error('Failed to download template') })} disabled={downloadMutation.isPending}>
                {downloadMutation.isPending ? 'Downloading...' : 'Download Template'}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Step 2 of 3: Upload and Preview</p>
              <p className="text-xs text-muted-foreground mb-2">
                Upload the sourcing_template.xlsx you filled in.
              </p>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded p-4 cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'Click to select .xlsx file'}
                </span>
                <input
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  onChange={(e) => { setPreviewResult(null); setSelectedFile(e.target.files?.[0] ?? null) }}
                />
              </label>

              <Button
                onClick={() => {
                  if (!selectedFile) return
                  previewMutation.mutate(selectedFile, {
                    onSuccess: (data) => setPreviewResult(data),
                    onError: () => toast.error('Failed to parse file. Make sure you used the template.'),
                  })
                }}
                disabled={!selectedFile || previewMutation.isPending}
              >
                {previewMutation.isPending ? 'Previewing...' : 'Preview'}
              </Button>

              {previewResult !== null && (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Valid rows ({previewResult.valid.length} items)</p>
                    <div className="text-xs space-y-1 mt-1">
                      {previewResult.valid.slice(0, 100).map((row, i) => (
                        <div key={i} className="grid grid-cols-4 gap-2">
                          <span>{row.product_name}</span>
                          <span>{row.variant_name}</span>
                          <span>{row.unit_price}</span>
                          <span>{row.qty_suggested ?? '-'}</span>
                        </div>
                      ))}
                    </div>
                    {previewResult.valid.length > 100 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ...and {previewResult.valid.length - 100} more
                      </p>
                    )}
                  </div>

                  {previewResult.errors.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-amber-600">Errors ({previewResult.errors.length} rows skipped)</p>
                      {previewResult.errors.map((err, i) => (
                        <p key={i} className="text-xs text-amber-600">
                          {err.row != null ? `Row ${err.row}: ` : ''}{err.message ?? JSON.stringify(err)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Step 3 of 3: Confirm Import</p>
              <p className="text-sm">
                Ready to import {previewResult!.valid.length} item(s) for {supplierName}.
              </p>
              {previewResult!.errors.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {previewResult!.errors.length} row(s) had errors and will be skipped.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {step === 1 && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 1 && (
            <Button onClick={() => setStep(2)}>I've filled it in →</Button>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button
                onClick={() => setStep(3)}
                disabled={previewResult === null || previewResult.valid.length === 0}
              >
                Continue to Confirm →
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
              <Button
                onClick={() => {
                  importMutation.mutate(
                    { supplierId, rows: previewResult!.valid },
                    {
                      onSuccess: (result) => {
                        toast.success(`Imported ${result.created} new, ${result.updated} updated`)
                        onImportSuccess(previewResult!.valid)
                        handleClose()
                      },
                      onError: () => toast.error('Import failed. Please try again.'),
                    },
                  )
                }}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
