import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWarehouses, useBulkUpdateInventory } from '../../hooks/useInventory'
import { getProductVariantStocks } from '../../api/inventory'
import type { ProductVariantStock } from '../../types/inventory'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from '../../lib/toast'
import { ArrowLeft } from 'lucide-react'

interface BulkRow {
  id: number
  variant_id: string
  product_name: string
  variant_name: string
  sku_variant_code: string
  warehouse_id: string
  qty: number
  type: 'replace' | 'add' | 'min'
  current_stock: number
}

function computeAfter(type: BulkRow['type'], current: number, qty: number): number {
  if (type === 'add') return current + qty
  if (type === 'replace') return qty
  return Math.max(0, current - qty)
}

export default function BulkStockUpdatePage() {
  const navigate = useNavigate()
  const { data: warehousesData } = useWarehouses()
  const bulkMutation = useBulkUpdateInventory()

  const warehouses = warehousesData?.results ?? []

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductVariantStock[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [rows, setRows] = useState<BulkRow[]>([])
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null)

  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await getProductVariantStocks({ search: q, page_size: 50 }).then(r => r.data)
      setSearchResults(res.results)
      setHasSearched(true)
    } catch {
      toast.error('Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const addRow = (v: ProductVariantStock) => {
    setRows(prev => [...prev, {
      id: Date.now(),
      variant_id: v.id,
      product_name: v.product_name,
      variant_name: v.name,
      sku_variant_code: v.sku_variant_code,
      warehouse_id: '',
      qty: 0,
      type: 'add',
      current_stock: v.total_available_qty,
    }])
  }

  const updateRow = (id: number, field: keyof BulkRow, value: string | number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const removeRow = (id: number) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.variant_id && r.warehouse_id && r.qty > 0)
    if (validRows.length === 0) {
      toast.error('No valid rows to submit')
      return
    }
    try {
      const updates = validRows.map(r => ({
        variant_id: r.variant_id,
        warehouse_id: r.warehouse_id,
        qty: r.qty,
        type: r.type,
      }))
      const res = await bulkMutation.mutateAsync(updates)
      setResult({ successful: res.summary?.successful ?? 0, failed: res.summary?.failed ?? 0 })
      toast.success(`Updated ${res.summary?.successful ?? 0} stocks`)
      setRows([])
    } catch {
      toast.error('Failed to update inventory')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/stock')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Stock
      </Button>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Step 1 — Search Product</h2>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-[360px]"
          />
          <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {hasSearched && (
          <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No products found</div>
            ) : (
              searchResults.map(v => (
                <div key={v.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{v.product_name} · {v.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addRow(v)}>
                    + Add
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Step 2 — Set Warehouse & Quantity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Product / Variant</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2 text-right">Current QTY</th>
                  <th className="p-2 text-right">After</th>
                  <th className="p-2">Warehouse</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Qty</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      <p className="font-medium">{row.product_name}</p>
                      <p className="text-xs text-muted-foreground">{row.variant_name}</p>
                    </td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{row.sku_variant_code}</td>
                    <td className="p-2 text-right tabular-nums text-muted-foreground">
                      {row.current_stock.toLocaleString()}
                    </td>
                    <td className="p-2 text-right tabular-nums font-medium">
                      {(() => {
                        if (row.qty <= 0) return <span className="text-muted-foreground">&mdash;</span>
                        const rawAfter = row.type === 'add'
                          ? row.current_stock + row.qty
                          : row.type === 'replace'
                          ? row.qty
                          : row.current_stock - row.qty
                        const isNegative = rawAfter < 0
                        return (
                          <span className={isNegative ? 'text-red-600 dark:text-red-400' : ''}>
                            {computeAfter(row.type, row.current_stock, row.qty).toLocaleString()}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="p-2">
                      <Select value={row.warehouse_id} onValueChange={v => updateRow(row.id, 'warehouse_id', v)}>
                        <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select value={row.type} onValueChange={v => updateRow(row.id, 'type', v)}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Add</SelectItem>
                          <SelectItem value="replace">Set</SelectItem>
                          <SelectItem value="min">Remove</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={row.qty}
                        onChange={e => updateRow(row.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-[80px]"
                      />
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)}>×</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={bulkMutation.isPending || rows.filter(r => r.warehouse_id && r.qty > 0).length === 0}
            >
              {bulkMutation.isPending ? 'Updating...' : `Update ${rows.filter(r => r.warehouse_id && r.qty > 0).length} Row${rows.filter(r => r.warehouse_id && r.qty > 0).length !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" onClick={() => setRows([])}>Clear All</Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-muted p-4">
          <p className="text-sm font-medium">Update complete</p>
          <p className="text-sm">Successful: {result.successful} · Failed: {result.failed}</p>
        </div>
      )}
    </div>
  )
}
