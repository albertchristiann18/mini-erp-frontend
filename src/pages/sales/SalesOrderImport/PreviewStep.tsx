import { Button } from '../../../components/ui/button'
import type { ExcelImportPreviewResponse, ExcelImportSkuMapping } from '../types'

interface PreviewStepProps {
  previewData: ExcelImportPreviewResponse
  skuMappings: ExcelImportSkuMapping[]
  skipUnmatched: boolean
  unresolvedCount: number
  hasNothingToDo: boolean
  onOpenSkuModal: () => void
  onSkipUnmatchedChange: (skip: boolean) => void
}

export function PreviewStep({
  previewData,
  skuMappings,
  skipUnmatched,
  unresolvedCount,
  hasNothingToDo,
  onOpenSkuModal,
  onSkipUnmatchedChange,
}: PreviewStepProps) {
  return (
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
          <Button variant="outline" size="sm" onClick={onOpenSkuModal}>
            Resolve SKUs
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipUnmatched}
              onChange={(e) => onSkipUnmatchedChange(e.target.checked)}
              className="rounded border-border"
            />
            Skip orders with unmatched SKUs
          </label>
        </div>
      )}
    </div>
  )
}
