/**
 * StockTable — table body for StockPage.
 *
 * Owns: the table element, header (with select-all checkbox), per-row change
 * controls (inline +/−/= buttons, qty input, save/unstage), preview column,
 * loading row, and empty row.
 */
import { Save, X } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Loading, ErrorState, Empty } from '../../../components/ui/queryPrimitives'
import type { ApiError } from '../../../lib/errors'
import type { ProductVariantStock } from '../../../types/inventory'
import type { PendingChange, AdjustType } from '../../../hooks/inventory/stockHelpers'
import { computePreview, formatAdjustment } from '../../../hooks/inventory/stockHelpers'

export interface StockTableProps {
  canEdit: boolean
  isLoading: boolean
  isError: boolean
  error: ApiError | null
  onRetry: () => void
  data: { results: ProductVariantStock[] } | undefined
  pending: Record<string, PendingChange>
  rowInputs: Record<string, string>
  rowTypes: Record<string, AdjustType>
  selected: Set<string>
  allOnPageSelected: boolean
  adjustIsPending: boolean
  onToggleSelectAll: () => void
  onToggleSelect: (id: string) => void
  onSetRowInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onStageChange: (v: ProductVariantStock, type: AdjustType) => void
  onUnstage: (variantId: string) => void
  onSave: (ids: string[]) => void
}

export function StockTable({
  canEdit,
  isLoading,
  isError,
  error,
  onRetry,
  data,
  pending,
  rowInputs,
  rowTypes,
  selected,
  allOnPageSelected,
  adjustIsPending,
  onToggleSelectAll,
  onToggleSelect,
  onSetRowInputs,
  onStageChange,
  onUnstage,
  onSave,
}: StockTableProps) {
  const colSpan = canEdit ? 8 : 5

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {canEdit && (
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-gray-300 cursor-pointer"
                />
              </TableHead>
            )}
            <TableHead>Product</TableHead>
            <TableHead>SKU Variant</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            {canEdit && (
              <>
                <TableHead className="text-center w-56">Change</TableHead>
                <TableHead className="text-center w-24">Preview</TableHead>
                <TableHead className="w-28" />
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-10">
                <Loading />
              </TableCell>
            </TableRow>
          ) : isError && error ? (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <ErrorState error={error} onRetry={onRetry} />
              </TableCell>
            </TableRow>
          ) : data?.results.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan}>
                <Empty message="No variants found" />
              </TableCell>
            </TableRow>
          ) : data?.results.map(v => (
            <StockRow
              key={v.id}
              v={v}
              canEdit={canEdit}
              pending={pending}
              rowInputs={rowInputs}
              rowTypes={rowTypes}
              selected={selected}
              adjustIsPending={adjustIsPending}
              onToggleSelect={onToggleSelect}
              onSetRowInputs={onSetRowInputs}
              onStageChange={onStageChange}
              onUnstage={onUnstage}
              onSave={onSave}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Per-row helper component ───────────────────────────────────────────────────

interface StockRowProps {
  v: ProductVariantStock
  canEdit: boolean
  pending: Record<string, PendingChange>
  rowInputs: Record<string, string>
  rowTypes: Record<string, AdjustType>
  selected: Set<string>
  adjustIsPending: boolean
  onToggleSelect: (id: string) => void
  onSetRowInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onStageChange: (v: ProductVariantStock, type: AdjustType) => void
  onUnstage: (variantId: string) => void
  onSave: (ids: string[]) => void
}

function StockRow({
  v,
  canEdit,
  pending,
  rowInputs,
  rowTypes,
  selected,
  adjustIsPending,
  onToggleSelect,
  onSetRowInputs,
  onStageChange,
  onUnstage,
  onSave,
}: StockRowProps) {
  const hasLockedType = rowTypes[v.id] !== undefined
  const lockedType = rowTypes[v.id]
  const hasPending = !!pending[v.id]
  const isSelected = selected.has(v.id)

  const previewQty = hasLockedType ? (() => {
    const inputVal = rowInputs[v.id]
    const inputNum = parseInt(inputVal ?? '')
    return (!isNaN(inputNum) && inputNum >= 0)
      ? computePreview(v.physical_qty, lockedType, inputNum)
      : null
  })() : hasPending
    ? computePreview(v.physical_qty, pending[v.id].type, pending[v.id].qty)
    : null

  return (
    <TableRow
      className={
        (hasLockedType || hasPending)
          ? 'bg-yellow-50 dark:bg-yellow-950/20'
          : isSelected
            ? 'bg-blue-50/50 dark:bg-blue-950/10'
            : ''
      }
    >
      {canEdit && (
        <TableCell>
          <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(v.id)} className="rounded border-gray-300 cursor-pointer" />
        </TableCell>
      )}
      <TableCell className="font-medium">{v.product_name}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{v.sku_variant_code}</TableCell>
      <TableCell className="text-muted-foreground text-sm">{v.category_name}</TableCell>
      <TableCell className="text-right font-medium tabular-nums">{v.physical_qty}</TableCell>

      {canEdit && (
        <>
          <TableCell>
            {hasLockedType ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-16 text-xs"
                  placeholder="Qty"
                  value={rowInputs[v.id] ?? ''}
                  onChange={e => onSetRowInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                />
                {lockedType === 'min' && (
                  <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 dark:text-red-400"
                          onClick={() => onStageChange(v, 'min')} title="Subtract">
                    −
                  </Button>
                )}
                {lockedType === 'set' && (
                  <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground"
                          onClick={() => onStageChange(v, 'set')} title="Set to">
                    =
                  </Button>
                )}
                {lockedType === 'add' && (
                  <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 dark:text-green-400"
                          onClick={() => onStageChange(v, 'add')} title="Add">
                    +
                  </Button>
                )}
              </div>
            ) : hasPending ? (
              <div className="flex justify-center">
                <Badge variant="outline" className="font-mono text-xs">
                  {formatAdjustment(pending[v.id].type, pending[v.id].qty)}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  className="h-7 w-16 text-xs"
                  placeholder="Qty"
                  value={rowInputs[v.id] ?? ''}
                  onChange={e => onSetRowInputs(prev => ({ ...prev, [v.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && onStageChange(v, 'add')}
                />
                <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 dark:text-red-400"
                        disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                        onClick={() => onStageChange(v, 'min')} title="Subtract">
                  −
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground"
                        disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                        onClick={() => onStageChange(v, 'set')} title="Set to">
                  =
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 dark:text-green-400"
                        disabled={!rowInputs[v.id] || isNaN(parseInt(rowInputs[v.id] ?? ''))}
                        onClick={() => onStageChange(v, 'add')} title="Add">
                  +
                </Button>
              </div>
            )}
          </TableCell>

          <TableCell className="text-center tabular-nums">
            {previewQty !== null ? (
              <span className={previewQty !== v.physical_qty ? 'font-semibold text-blue-600 dark:text-blue-400' : 'font-medium'}>
                {previewQty}
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-1 justify-end">
              {(hasLockedType || hasPending) ? (
                <>
                  <Button size="sm" className="h-7 text-xs"
                          onClick={() => onSave([v.id])}
                          disabled={adjustIsPending || (hasLockedType && (isNaN(parseInt(rowInputs[v.id] ?? '')) || parseInt(rowInputs[v.id] ?? '') < 0))}>
                    <Save className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUnstage(v.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : null}
            </div>
          </TableCell>
        </>
      )}
    </TableRow>
  )
}
