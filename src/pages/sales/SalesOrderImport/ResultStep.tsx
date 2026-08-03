import { CheckCircle2 } from 'lucide-react'
import type { ExcelImportConfirmResponse } from '../types'

interface ResultStepProps {
  resultData: ExcelImportConfirmResponse
}

export function ResultStep({ resultData }: ResultStepProps) {
  return (
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
  )
}
