import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Tag } from 'lucide-react'
import { getDimLabel, fmtNum } from '../../../hooks/inventory/productDetailHelpers'
import type { ProductVariant, VariantDimension } from '../../../types/inventory'

export interface VariantDetailTableProps {
  activeVariants: ProductVariant[]
  dims: VariantDimension[]
  isStaff: boolean
  editingPrices: boolean
  editedPrices: Record<string, number>
  isSavingPrices: boolean
  setEditedPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>
  onStartEditPrices: () => void
  onCancelPrices: () => void
  onSavePrices: () => void
}

export function VariantDetailTable({
  activeVariants,
  dims,
  isStaff,
  editingPrices,
  editedPrices,
  isSavingPrices,
  setEditedPrices,
  onStartEditPrices,
  onCancelPrices,
  onSavePrices,
}: VariantDetailTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Variant Detail</h2>
        {isStaff && (
          editingPrices ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={onSavePrices} disabled={isSavingPrices}>
                <Tag className="h-4 w-4 mr-1" />
                {isSavingPrices ? 'Saving...' : 'Save Prices'}
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelPrices}>Cancel</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={onStartEditPrices}>
              <Tag className="h-4 w-4 mr-1" /> Edit Prices
            </Button>
          )
        )}
      </div>

      {activeVariants.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No variants</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {dims.map(d => (
                  <th key={d.id} className="text-left px-4 py-3 font-medium">{d.name}</th>
                ))}
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Cost (COGS)</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeVariants.map(v => (
                <tr key={v.id}>
                  {dims.map(d => (
                    <td key={d.id} className="px-4 py-3 font-medium">
                      {getDimLabel(d, v.variant_values?.[d.id])}
                    </td>
                  ))}
                  <td className="px-4 py-3 font-mono text-xs">{v.sku_variant_code}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtNum(v.current_cogs)}
                  </td>
                  <td className="px-4 py-3">
                    {editingPrices ? (
                      <Input
                        type="number"
                        min="0"
                        value={editedPrices[v.id] ?? v.base_price}
                        onChange={e =>
                          setEditedPrices(prev => ({
                            ...prev,
                            [v.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="h-8 w-32"
                      />
                    ) : (
                      fmtNum(v.base_price)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {v.total_available_qty ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
