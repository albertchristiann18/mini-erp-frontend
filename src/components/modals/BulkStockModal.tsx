import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useProductVariants, useWarehouses, useBulkUpdateInventory } from '../../hooks/useInventory'
import { toast } from '../../lib/toast'

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
  const { data: variantsData } = useProductVariants()
  const { data: warehousesData } = useWarehouses()
  const bulkMutation = useBulkUpdateInventory()
  const [rows, setRows] = useState<Row[]>([{ id: 1, variant_id: '', warehouse_id: '', qty: 0, type: 'replace' }])
  const [result, setResult] = useState<{ successful: number; failed: number } | null>(null)

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
                      <Select value={row.variant_id} onValueChange={(v) => updateRow(row.id, 'variant_id', v)}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select variant" /></SelectTrigger>
                        <SelectContent>
                          {variants.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={bulkMutation.isPending}>
            {bulkMutation.isPending ? 'Updating...' : 'Update Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}