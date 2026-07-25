/**
 * SelectionActionBar — blue selected-rows bar for StockPage.
 *
 * Shown when at least one row is selected and canEdit is true.
 * Owns: Bulk Edit Stock button, Save Selected button, Deselect All.
 */
import { Save, Layers, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'

export interface SelectionActionBarProps {
  selectedCount: number
  selectedPendingIds: string[]
  adjustIsPending: boolean
  onBulkEdit: () => void
  onSaveSelected: (ids: string[]) => void
  onDeselectAll: () => void
}

export function SelectionActionBar({
  selectedCount,
  selectedPendingIds,
  adjustIsPending,
  onBulkEdit,
  onSaveSelected,
  onDeselectAll,
}: SelectionActionBarProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-2">
      <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-2 ml-2">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={onBulkEdit}
        >
          <Layers className="h-3 w-3 mr-1" /> Bulk Edit Stock
        </Button>
        {selectedPendingIds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onSaveSelected(selectedPendingIds)}
            disabled={adjustIsPending}
          >
            <Save className="h-3 w-3 mr-1" /> Save Selected ({selectedPendingIds.length})
          </Button>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 text-xs text-muted-foreground ml-auto"
        onClick={onDeselectAll}
      >
        <X className="h-3 w-3 mr-1" /> Deselect All
      </Button>
    </div>
  )
}
