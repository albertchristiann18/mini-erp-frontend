import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { useStockClosingReport, useWarehouses } from '../../hooks/api/useInventory'
import type { StockMovement } from '../../types/inventory'

interface ClosingRow {
  variant_id: string
  sku_variant_code: string
  variant_name: string
  beginning_qty: number
  in_qty: number
  out_qty: number
  adj_qty: number
  after_qty: number
}

function exportCsv(rows: ClosingRow[], month: string): void {
  const header = "SKU Variant,Variant Name,Beginning,In,Out,Adjustment,After"
  const lines = rows.map(r =>
    [r.sku_variant_code, r.variant_name, r.beginning_qty, r.in_qty, r.out_qty, r.adj_qty, r.after_qty].join(",")
  )
  const csv = [header, ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `stock-closing-${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export default function StockClosingPage() {
  const [month, setMonth] = useState(currentMonth())
  const [warehouseId, setWarehouseId] = useState("all")

  const { data: warehousesData } = useWarehouses()
  const warehouses = warehousesData?.results ?? []

  const { data, isLoading } = useStockClosingReport(month, warehouseId !== "all" ? warehouseId : "")

  const rows: ClosingRow[] = useMemo(() => {
    const movements = data?.results ?? []
    const map = new Map<string, StockMovement[]>()
    movements.forEach(m => {
      const existing = map.get(m.product_variant) ?? []
      existing.push(m)
      map.set(m.product_variant, existing)
    })

    const result: ClosingRow[] = []
    map.forEach((mvs, variantId) => {
      const sorted = [...mvs].sort((a, b) => a.cdate.localeCompare(b.cdate))

      const beginning_qty = sorted[0].balance_before
      const after_qty = sorted[sorted.length - 1].balance_after

      let in_qty = 0
      let out_qty = 0
      let adj_qty = 0

      sorted.forEach(m => {
        if (m.movement_type === "PURCHASE" || m.movement_type === "INBOUND") {
          in_qty += Math.abs(m.quantity)
        } else if (m.movement_type === "OUTBOUND") {
          out_qty += Math.abs(m.quantity)
        } else {
          adj_qty += m.quantity
        }
      })

      result.push({
        variant_id: variantId,
        sku_variant_code: sorted[0].product_variant_name ?? variantId,
        variant_name: sorted[0].product_variant_name,
        beginning_qty,
        in_qty,
        out_qty,
        adj_qty,
        after_qty,
      })
    })

    return result.sort((a, b) => a.variant_name.localeCompare(b.variant_name))
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold flex-1">Stock Closing Report</h1>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-40 text-sm"
          />
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Warehouses</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(rows, month)}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {rows.length} variants with movements in {month}
        {warehouseId !== "all" ? ` · ${warehouses.find(w => w.id === warehouseId)?.name ?? ""}` : ""}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant Name</TableHead>
              <TableHead className="text-right">Beginning</TableHead>
              <TableHead className="text-right text-green-600">In</TableHead>
              <TableHead className="text-right text-red-600">Out</TableHead>
              <TableHead className="text-right text-yellow-600">Adjustment</TableHead>
              <TableHead className="text-right">After</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No stock movements for {month}
                    {warehouseId !== "all" ? " in this warehouse" : ""}
                </TableCell>
              </TableRow>
            ) : rows.map(row => (
              <TableRow key={row.variant_id}>
                <TableCell>
                  <div className="font-medium">{row.variant_name}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.beginning_qty}</TableCell>
                <TableCell className="text-right tabular-nums text-green-600">
                  {row.in_qty > 0 ? `+${row.in_qty}` : row.in_qty}
                </TableCell>
                <TableCell className="text-right tabular-nums text-red-600">
                  {row.out_qty > 0 ? `-${row.out_qty}` : row.out_qty}
                </TableCell>
                <TableCell className={`text-right tabular-nums ${
                  row.adj_qty > 0 ? "text-green-600" : row.adj_qty < 0 ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {row.adj_qty > 0 ? `+${row.adj_qty}` : row.adj_qty}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{row.after_qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
