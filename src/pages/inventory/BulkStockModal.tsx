import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useAllVariants, useWarehouses, useBulkUpdateInventory } from '../../hooks/api/inventory'
import { toast } from '../../lib/toast'

interface VariantComboboxProps {
  value: string
  onChange: (id: string) => void
  variants: Array<{ id: string; product_name: string; name: string; sku_variant_code: string }>
}

function VariantCombobox({ value, onChange, variants }: VariantComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = variants.find(v => v.id === value) ?? null
  const filtered = query.trim()
    ? variants.filter(v =>
        v.name.toLowerCase().includes(query.toLowerCase()) ||
        v.product_name.toLowerCase().includes(query.toLowerCase()) ||
        v.sku_variant_code.toLowerCase().includes(query.toLowerCase())
      )
    : variants

  return (
    <div className="relative">
      <input
        className="flex h-9 w-[260px] rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        placeholder="Search variant..."
        value={open ? query : (selected ? `${selected.product_name} · ${selected.name}` : '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered.length > 0) {
              onChange(filtered[0].id)
              setOpen(false)
              setQuery('')
            }
          }
          if (e.key === 'Escape') {
            setOpen(false)
            setQuery('')
          }
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150)
        }}
        autoComplete="off"
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-[320px] overflow-y-auto rounded-md border bg-card shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">No variants found</div>
          ) : (
            filtered.map(v => (
              <button
                key={v.id}
                type="button"
                onMouseDown={() => {
                  onChange(v.id)
                  setOpen(false)
                  setQuery('')
                }}
                className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${
                  v.id === value ? 'bg-accent/50' : ''
                }`}
              >
                <span className="font-medium">{v.product_name} · {v.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface Row {
  id: number
  variant_id: string
  warehouse_id: string
  qty: number
  type: 'replace' | 'add' | 'min'
}

interface Props {
  open: boolean
  onClose: () => void
}

export function BulkStockModal({ open, onClose }: Props) {
  const { data: variantsData } = useAllVariants()
  const { data: warehousesData } = useWarehouses()
  const bulkMutation = useBulkUpdateInventory()
  const [rows, setRows] = useState<Row[]>([{ id: 1, variant_id: '', warehouse_id: '', qty: 0, type: 'replace' }])
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const validRows = rows.filter(r => r.variant_id && r.warehouse_id && r.qty > 0)

  const variants = variantsData?.results ?? []
  const warehouses = warehousesData?.results ?? []

  const handleClose = () => {
    setRows([{ id: 1, variant_id: '', warehouse_id: '', qty: 0, type: 'replace' }])
    setResult(null)
    onClose()
  }

  const addRow = () => {
    setRows([...rows, { id: Date.now(), variant_id: '', warehouse_id: '', qty: 0, type: 'replace' }])
  }

  const updateRow = (id: number, field: keyof Row, value: string | number) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id))
  }

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.variant_id && r.warehouse_id && r.qty > 0)
    if (validRows.length === 0) {
      toast.error('No valid rows')
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
    } catch {
      toast.error('Failed to update inventory')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Stock Update</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Variant</th>
                  <th className="text-left p-2">Warehouse</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-1">
                      <VariantCombobox
                        value={row.variant_id}
                        onChange={(v) => updateRow(row.id, 'variant_id', v)}
                        variants={variants}
                      />
                    </td>
                    <td className="p-1">
                      <Select value={row.warehouse_id} onValueChange={(v) => updateRow(row.id, 'warehouse_id', v)}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Select value={row.type} onValueChange={(v) => updateRow(row.id, 'type', v)}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="replace">Set</SelectItem>
                          <SelectItem value="add">Add</SelectItem>
                          <SelectItem value="min">Remove</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Input
                        type="number"
                        value={row.qty}
                        onChange={(e) => updateRow(row.id, 'qty', parseInt(e.target.value) || 0)}
                        className="w-[80px]"
                      />
                    </td>
                    <td className="p-1">
                      <Button variant="ghost" size="sm" onClick={() => removeRow(row.id)} disabled={rows.length <= 1}>
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" onClick={addRow}>+ Add Row</Button>
          {result && (
            <div className="p-3 bg-muted rounded-lg">
              <p>Successful: {result.successful}</p>
              <p>Failed: {result.failed}</p>
            </div>
          )}
          {validRows.length > 0 && (
            <div className="rounded-md border">
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-left"
              >
                <span>{validRows.length} change{validRows.length !== 1 ? 's' : ''} ready</span>
                <span className="text-muted-foreground text-xs">{showPreview ? 'Hide ▲' : 'Show ▼'}</span>
              </button>
              {showPreview && (
                <div className="border-t divide-y max-h-48 overflow-y-auto">
                  {validRows.map(row => {
                    const variant = variants.find(v => v.id === row.variant_id)
                    const warehouse = warehouses.find(w => w.id === row.warehouse_id)
                    const typeLabel = row.type === 'replace' ? 'Set' : row.type === 'add' ? 'Add' : 'Remove'
                    return (
                      <div key={row.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {variant ? `${variant.product_name} · ${variant.name}` : row.variant_id}
                          </p>
                          <p className="text-xs text-muted-foreground">{warehouse?.name ?? row.warehouse_id}</p>
                        </div>
                        <div className="ml-3 shrink-0 text-right tabular-nums">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {typeLabel} {row.qty}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={bulkMutation.isPending || validRows.length === 0}>
            {bulkMutation.isPending ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}