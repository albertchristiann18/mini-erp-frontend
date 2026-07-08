import { useState } from 'react'
import { Upload, Trash2, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import { useWarehouses, useCompanyMarketplaces } from '../../../hooks/api/useInventory'
import { usePreviewSalesOrderImport, useConfirmSalesOrderImport } from '../hooks/useSales'
import { toast } from '../../../lib/toast'
import { SkuResolutionModal } from './SkuResolutionModal'
import type { AxiosError } from 'axios'
import type { ExcelImportPreviewResponse, ExcelImportConfirmResponse, ExcelImportSkuMapping } from '../types'

interface SalesOrderImportModalProps {
  open: boolean
  onClose: () => void
  onImportSuccess: () => void
}

type Step = 'upload' | 'preview' | 'confirm' | 'result'

export function SalesOrderImportModal({ open, onClose, onImportSuccess }: SalesOrderImportModalProps) {
  const { data: warehousesData } = useWarehouses()
  const { data: marketplacesData } = useCompanyMarketplaces()
  const previewMutation = usePreviewSalesOrderImport()
  const confirmMutation = useConfirmSalesOrderImport()

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [marketplaceId, setMarketplaceId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [previewData, setPreviewData] = useState<ExcelImportPreviewResponse | null>(null)
  const [skuMappings, setSkuMappings] = useState<ExcelImportSkuMapping[]>([])
  const [skipUnmatched, setSkipUnmatched] = useState(false)
  const [resultData, setResultData] = useState<ExcelImportConfirmResponse | null>(null)
  const [showSkuModal, setShowSkuModal] = useState(false)

  const warehouses = warehousesData?.results ?? []
  const marketplaces = marketplacesData?.results ?? []

  const unresolvedCount = previewData
    ? previewData.unmatched_skus.filter(u => !skuMappings.some(m => m.shopee_sku === u.shopee_sku)).length
    : 0

  const hasNothingToDo = !!previewData
    && previewData.new_orders.length === 0
    && previewData.status_updates.length === 0
    && previewData.cancellation_transitions.length === 0

  const stockEligibleCount = previewData?.new_orders.filter(o =>
    ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(o.mapped_status)
  ).length ?? 0

  const handleClose = () => {
    setStep('upload'); setFile(null); setMarketplaceId(''); setWarehouseId('')
    setPreviewData(null); setSkuMappings([]); setSkipUnmatched(false)
    setResultData(null); setShowSkuModal(false)
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Import Shopee Orders'}
            {step === 'preview' && 'Import Shopee Orders'}
            {step === 'confirm' && 'Import Shopee Orders'}
            {step === 'result' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Step 1 of 4</p>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
              Pastikan kolom 'Nomor Referensi SKU' sudah diisi di Shopee Seller Center sebelum import.
              SKU yang tidak ditemukan harus dipetakan manual.
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Marketplace</label>
              <Select value={marketplaceId} onValueChange={setMarketplaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select marketplace..." />
                </SelectTrigger>
                <SelectContent>
                  {marketplaces.map(mp => (
                    <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Warehouse</label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">File</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded p-6 cursor-pointer hover:border-primary transition-colors">
                {file ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setFile(null) }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-sm text-muted-foreground">Click to select .xlsx file</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  data-testid="file-input"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Step 2 of 4: Review</p>

            <p className="text-sm text-muted-foreground">
              Period: {previewData.file_summary.date_from ?? '–'} – {previewData.file_summary.date_to ?? '–'} · {previewData.file_summary.total_rows} rows
            </p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">New Orders</p>
                <p className="text-lg font-semibold">{previewData.new_orders.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Status Updates</p>
                <p className="text-lg font-semibold">{previewData.status_updates.length}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Skipped (already cancelled)</p>
                <p className="text-lg font-semibold">{previewData.skipped_already_cancelled}</p>
              </div>
              {previewData.cancellation_transitions.length > 0 && (
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Returns to Queue</p>
                  <p className="text-lg font-semibold">{previewData.cancellation_transitions.length}</p>
                </div>
              )}
            </div>

            {hasNothingToDo && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                Nothing to import — all orders in this file are already up to date.
              </div>
            )}

            {previewData.unmatched_skus.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 space-y-2">
                <p className="text-sm text-amber-800">
                  {previewData.unmatched_skus.length} SKU(s) not found. Resolved: {skuMappings.length} · Remaining: {unresolvedCount}
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowSkuModal(true)}>
                  Resolve SKUs
                </Button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipUnmatched}
                    onChange={(e) => setSkipUnmatched(e.target.checked)}
                    className="rounded border-border"
                  />
                  Skip orders with unmatched SKUs
                </label>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && previewData && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Step 3 of 4: Confirm</p>

            <div className="rounded-lg bg-muted p-4 space-y-1 text-sm">
              <p>Will create: {previewData.new_orders.length} new orders</p>
              <p>Will update: {previewData.status_updates.length} order statuses</p>
              <p>Will skip (already cancelled): {previewData.skipped_already_cancelled}</p>
              {previewData.cancellation_transitions.length > 0 && (
                <p>Will queue for Returns: {previewData.cancellation_transitions.length}</p>
              )}
              {previewData.unmatched_skus.length > 0 && (
                <p>Unmatched items skipped: {skipUnmatched ? 'Yes' : 'No'}</p>
              )}
            </div>

            <p className="text-sm text-amber-700">
              Stock will be deducted for {stockEligibleCount} order(s). This cannot be automatically undone.
            </p>
          </div>
        )}

        {step === 'result' && resultData && (
          <div className="space-y-4">
            {(resultData.created > 0 || resultData.updated > 0) && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Import successful</span>
              </div>
            )}

            <div className="space-y-1 text-sm">
              <p>Orders created: {resultData.created}</p>
              <p>Orders updated: {resultData.updated}</p>
              {resultData.skipped_cancelled > 0 && (
                <p>Skipped (already cancelled): {resultData.skipped_cancelled}</p>
              )}
              {resultData.skipped_unmatched > 0 && (
                <p>Skipped (unmatched SKUs): {resultData.skipped_unmatched}</p>
              )}
              {resultData.returns_queued > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
                  Returns queued: {resultData.returns_queued} — process them on the Returns page.
                </div>
              )}
            </div>

            {resultData.errors.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Errors ({resultData.errors.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {resultData.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600">
                      {err.order_number}: {err.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => {
                  previewMutation.mutate(
                    { file: file!, marketplaceId, warehouseId },
                    {
                      onSuccess: (data) => { setPreviewData(data); setStep('preview') },
                      onError: (err) => toast.error((err as AxiosError<{ error?: string }>)?.response?.data?.error ?? 'Failed to parse file'),
                    }
                  )
                }}
                disabled={!file || !marketplaceId || !warehouseId || previewMutation.isPending}
              >
                {previewMutation.isPending ? 'Parsing...' : 'Preview File'}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={hasNothingToDo || (unresolvedCount > 0 && !skipUnmatched)}
              >
                Proceed to Import
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')} disabled={confirmMutation.isPending}>
                Back
              </Button>
              <Button
                onClick={() => {
                  confirmMutation.mutate(
                    { file: file!, marketplaceId, warehouseId, skuMappings, skipUnmatched },
                    {
                      onSuccess: (data) => { setResultData(data); setStep('result') },
                      onError: (err) => toast.error((err as AxiosError<{ error?: string }>)?.response?.data?.error ?? 'Import failed'),
                    }
                  )
                }}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? 'Importing...' : 'Confirm Import'}
              </Button>
            </>
          )}

          {step === 'result' && (
            <Button onClick={() => { onImportSuccess(); handleClose() }}>
              Close
            </Button>
          )}
        </DialogFooter>

        <SkuResolutionModal
          open={showSkuModal}
          onClose={() => setShowSkuModal(false)}
          unmatchedSkus={previewData?.unmatched_skus ?? []}
          onConfirm={(mappings) => { setSkuMappings(mappings); setShowSkuModal(false) }}
        />
      </DialogContent>
    </Dialog>
  )
}
