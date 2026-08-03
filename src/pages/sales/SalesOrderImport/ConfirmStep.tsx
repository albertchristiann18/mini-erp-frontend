import type { ExcelImportPreviewResponse } from '../types'

interface ConfirmStepProps {
  previewData: ExcelImportPreviewResponse
  skipUnmatched: boolean
  stockEligibleCount: number
}

export function ConfirmStep({ previewData, skipUnmatched, stockEligibleCount }: ConfirmStepProps) {
  return (
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
  )
}
