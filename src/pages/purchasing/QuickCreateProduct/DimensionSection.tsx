import { X, Plus } from 'lucide-react'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import type { DimensionRow } from '../../../hooks/purchasing/useQuickCreateProduct'

interface Props {
  dimensionRows: DimensionRow[]
  errors: Record<string, string>
  skuError: string | null
  onAddRow: () => void
  onRemoveRow: (idx: number) => void
  onUpdateName: (idx: number, name: string) => void
  onUpdateInputValue: (idx: number, value: string) => void
  onAddValue: (idx: number) => void
  onRemoveValue: (dimIdx: number, valIdx: number) => void
  onUpdateValueCode: (dimIdx: number, valIdx: number, code: string) => void
}

export function DimensionSection({
  dimensionRows,
  errors,
  skuError,
  onAddRow,
  onRemoveRow,
  onUpdateName,
  onUpdateInputValue,
  onAddValue,
  onRemoveValue,
  onUpdateValueCode,
}: Props) {
  const variantCount =
    dimensionRows.some(d => d.name.trim() && d.values.length > 0)
      ? dimensionRows
          .filter(d => d.name.trim() && d.values.length > 0)
          .reduce((acc, d) => acc * d.values.length, 1)
      : 0

  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium">
          Variant Dimensions <span className="text-muted-foreground font-normal">(optional)</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onAddRow}>
          <Plus className="h-3 w-3 mr-1" /> Add Dimension
        </Button>
      </div>

      {dimensionRows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No dimensions — a Default variant will be created automatically.
        </p>
      ) : (
        <div className="space-y-2">
          {dimensionRows.map((dim, idx) => (
            <div key={dim.id} className="rounded-md border p-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={dim.name}
                  onChange={e => onUpdateName(idx, e.target.value)}
                  placeholder="Dimension name (e.g. Size, Color)"
                  className={`h-7 text-xs flex-1 ${errors[`dim_${idx}_name`] ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => onRemoveRow(idx)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {errors[`dim_${idx}_name`] && (
                <p className="text-xs text-destructive">{errors[`dim_${idx}_name`]}</p>
              )}

              {dim.values.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dim.values.map((val, vi) => (
                    <span
                      key={vi}
                      className="inline-flex items-center gap-1 rounded-md border bg-secondary/50 px-2 py-0.5 text-xs"
                    >
                      <span className="font-medium">{val.label}</span>
                      <span className="text-muted-foreground">·</span>
                      <input
                        value={val.code}
                        onChange={e => onUpdateValueCode(idx, vi, e.target.value)}
                        className="w-16 bg-transparent font-mono text-[10px] uppercase focus:outline-none border-b border-dashed border-muted-foreground/30 focus:border-primary"
                        maxLength={12}
                        placeholder="CODE"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveValue(idx, vi)}
                        className="text-muted-foreground hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-1">
                <Input
                  value={dim.inputValue}
                  onChange={e => onUpdateInputValue(idx, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddValue(idx)
                    }
                  }}
                  placeholder="Type a value and press Enter (e.g. S)"
                  className="h-7 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => onAddValue(idx)}
                >
                  Add
                </Button>
              </div>
              {errors[`dim_${idx}_values`] && (
                <p className="text-xs text-destructive">{errors[`dim_${idx}_values`]}</p>
              )}
            </div>
          ))}

          {variantCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              → {variantCount} variant{variantCount !== 1 ? 's' : ''} will be created
            </p>
          )}
          {errors['sku_duplicate'] && (
            <p className="text-xs text-destructive mt-1">{errors['sku_duplicate']}</p>
          )}
        </div>
      )}

      {skuError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-xs text-destructive mt-2">
          {skuError}
        </div>
      )}
    </div>
  )
}
