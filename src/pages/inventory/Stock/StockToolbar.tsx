/**
 * StockToolbar — top bar for StockPage.
 *
 * Owns: warehouse select, search input+button, variant count, unsaved badge,
 * Save All / Discard All, and the staff-only Bulk Update button.
 */
import { useNavigate } from 'react-router-dom'
import { Save, RotateCcw, Upload } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select'
import type { Warehouse } from '../../../types/inventory'

export interface StockToolbarProps {
  selectedWarehouse: string
  warehouses: Warehouse[]
  onWarehouseChange: (id: string) => void
  searchInput: string
  onSearchInputChange: (v: string) => void
  onCommitSearch: () => void
  variantCount: number
  pendingCount: number
  adjustIsPending: boolean
  isStaff: boolean
  onSaveAll: (ids: string[]) => void
  pendingIds: string[]
  onDiscardAll: () => void
}

export function StockToolbar({
  selectedWarehouse,
  warehouses,
  onWarehouseChange,
  searchInput,
  onSearchInputChange,
  onCommitSearch,
  variantCount,
  pendingCount,
  adjustIsPending,
  isStaff,
  onSaveAll,
  pendingIds,
  onDiscardAll,
}: StockToolbarProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={selectedWarehouse || 'all'} onValueChange={v => onWarehouseChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Warehouses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Warehouses</SelectItem>
          {warehouses.map(w => (
            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          placeholder="Search by product name or SKU..."
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCommitSearch()}
          className="w-[280px]"
        />
        <Button size="sm" variant="outline" onClick={onCommitSearch}>Search</Button>
      </div>

      <span className="text-sm text-muted-foreground">{variantCount} variants</span>

      <div className="ml-auto flex items-center gap-2 flex-wrap">
        {pendingCount > 0 && (
          <>
            <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
              {pendingCount} unsaved
            </Badge>
            <Button size="sm" variant="outline" onClick={onDiscardAll}>
              <RotateCcw className="h-3 w-3 mr-1" /> Discard All
            </Button>
            <Button size="sm" onClick={() => onSaveAll(pendingIds)} disabled={adjustIsPending}>
              <Save className="h-3 w-3 mr-1" /> Save All ({pendingCount})
            </Button>
          </>
        )}
        {isStaff && (
          <Button size="sm" variant="outline" onClick={() => navigate('/inventory/bulk-stock-update')}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Update
          </Button>
        )}
      </div>
    </div>
  )
}
