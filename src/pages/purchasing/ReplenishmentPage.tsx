import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReplenishment, useCreatePurchaseOrder } from '../../hooks/api/usePurchasing'
import { useWarehouses } from '../../hooks/api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { toast } from 'sonner'

type PlanRow = {
  variant_id: string
  sku_variant_code: string
  variant_name: string
  product_name: string
  stock_on_hand: number
  incoming_qty: number
  avg_sales: number
  doi_current: number
  upcoming_qty: number
  suggestion_qty: number
  cogs_est: number
}

export default function ReplenishmentPage() {
  const [warehouseId, setWarehouseId] = useState('all')
  const [avgWindow, setAvgWindow] = useState<7 | 30>(30)
  const [doiTarget, setDoiTarget] = useState(30)
  const [exchangeRate, setExchangeRate] = useState(2200)
  const [cogsRatio, setCogsRatio] = useState(15)
  const [orderQty, setOrderQty] = useState<Record<string, number>>({})
  const [unitPrice, setUnitPrice] = useState<Record<string, number>>({})

  const { user } = useAuth()
  const { data: warehousesData } = useWarehouses()
  const warehouses = warehousesData?.results ?? []
  const { data: replenishData, isLoading } = useReplenishment(warehouseId !== 'all' ? warehouseId : undefined)
  const items = replenishData?.results ?? []
  const createPO = useCreatePurchaseOrder()
  const navigate = useNavigate()

  const rows: PlanRow[] = useMemo(() =>
    items
      .map(item => {
        const avg_sales = avgWindow === 7 ? item.avg_sales_7d : item.avg_sales_30d
        const doi_current = avg_sales > 0 ? (item.stock_on_hand + item.incoming_qty) / avg_sales : 999
        const upcoming_qty = item.stock_on_hand + item.incoming_qty - avg_sales * doiTarget
        const suggestion_qty = Math.max(0, Math.ceil(-upcoming_qty))
        const qty = orderQty[item.variant_id] ?? 0
        const price = unitPrice[item.variant_id] ?? 0
        const cogs_est = qty * price * exchangeRate * (1 + cogsRatio / 100)
        return { ...item, avg_sales, doi_current, upcoming_qty, suggestion_qty, cogs_est }
      })
      .sort((a, b) => {
        const p = a.product_name.localeCompare(b.product_name)
        if (p !== 0) return p
        return a.variant_name.localeCompare(b.variant_name)
      }),
    [items, avgWindow, doiTarget, exchangeRate, cogsRatio, orderQty, unitPrice],
  )

  const totalOrderQty = Object.values(orderQty).reduce((s, v) => s + (v || 0), 0)
  const totalCogsEst = rows.reduce((s, r) => s + r.cogs_est, 0)
  const hasOrders = totalOrderQty > 0

  async function handleCreatePO() {
    const details = rows
      .filter(r => (orderQty[r.variant_id] ?? 0) > 0)
      .map(r => ({
        product_variant_id: r.variant_id,
        ordered_qty: orderQty[r.variant_id],
        unit_price_foreign: unitPrice[r.variant_id] ?? 0,
      }))
    if (details.length === 0) return
    try {
      await createPO.mutateAsync({
        warehouse_id: warehouseId !== 'all' ? warehouseId : warehouses[0]?.id || '',
        company_id: user?.company_id || '',
        exchange_rate: exchangeRate.toString(),
        currency: 'CNY',
        order_details: details,
      })
      toast.success('Draft PO created successfully')
      navigate('/purchasing/orders')
    } catch {
      toast.error('Failed to create draft PO')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Replenishment Planning</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border bg-card">
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Warehouses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${avgWindow === 7 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            onClick={() => setAvgWindow(7)}
          >7d</button>
          <button
            className={`px-3 py-1.5 text-sm ${avgWindow === 30 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
            onClick={() => setAvgWindow(30)}
          >30d</button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">DOI Target</span>
          <Input
            type="number"
            value={doiTarget}
            onChange={e => setDoiTarget(Number(e.target.value))}
            className="w-20 text-sm"
            min={1}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Rate (CNY→IDR)</span>
          <Input
            type="number"
            value={exchangeRate}
            onChange={e => setExchangeRate(Number(e.target.value))}
            className="w-24 text-sm"
            min={1}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">COGS %</span>
          <Input
            type="number"
            value={cogsRatio}
            onChange={e => setCogsRatio(Number(e.target.value))}
            className="w-16 text-sm"
            min={0}
          />
        </div>
      </div>
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product / Variant</TableHead>
              <TableHead className="text-right">SOH</TableHead>
              <TableHead className="text-right">Incoming</TableHead>
              <TableHead className="text-right">AVG/day</TableHead>
              <TableHead className="text-right">DOI</TableHead>
              <TableHead className="text-right">Upcoming</TableHead>
              <TableHead className="text-right">Suggestion</TableHead>
              <TableHead className="text-right w-24">Order QTY</TableHead>
              <TableHead className="text-right w-28">Unit Price (CNY)</TableHead>
              <TableHead className="text-right">COGS Est.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">No variants found</TableCell>
              </TableRow>
            ) : rows.map(row => (
              <TableRow key={row.variant_id} className={row.doi_current < doiTarget ? 'bg-red-50 dark:bg-red-950/10' : ''}>
                <TableCell>
                  <div className="font-medium">{row.product_name}</div>
                  <div className="text-xs text-muted-foreground">{row.sku_variant_code} · {row.variant_name}</div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.stock_on_hand}</TableCell>
                <TableCell className="text-right tabular-nums text-blue-600">{row.incoming_qty}</TableCell>
                <TableCell className="text-right tabular-nums">{row.avg_sales.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className={row.doi_current < doiTarget ? 'text-red-600 font-medium' : ''}>
                    {row.doi_current === 999 ? '∞' : row.doi_current.toFixed(0)}
                  </span>
                </TableCell>
                <TableCell className={`text-right tabular-nums ${row.upcoming_qty < 0 ? 'text-red-600' : ''}`}>
                  {Math.round(row.upcoming_qty)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium text-amber-600">
                  {row.suggestion_qty > 0 ? row.suggestion_qty : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    value={orderQty[row.variant_id] ?? ''}
                    placeholder={row.suggestion_qty > 0 ? String(row.suggestion_qty) : '0'}
                    onChange={e => setOrderQty(prev => ({ ...prev, [row.variant_id]: Number(e.target.value) }))}
                    className="w-20 text-right text-sm h-8"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={unitPrice[row.variant_id] ?? ''}
                    placeholder="0"
                    onChange={e => setUnitPrice(prev => ({ ...prev, [row.variant_id]: Number(e.target.value) }))}
                    className="w-24 text-right text-sm h-8"
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {row.cogs_est > 0 ? `Rp ${Math.round(row.cogs_est).toLocaleString('id-ID')}` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div className="flex gap-6 text-sm">
          <span className="text-muted-foreground">Total Order QTY: <strong className="text-foreground">{totalOrderQty}</strong></span>
          <span className="text-muted-foreground">Total COGS Est.: <strong className="text-foreground">Rp {Math.round(totalCogsEst).toLocaleString('id-ID')}</strong></span>
        </div>
        <Button
          onClick={handleCreatePO}
          disabled={!hasOrders || createPO.isPending}
        >
          {createPO.isPending ? 'Creating...' : 'Create Draft PO'}
        </Button>
      </div>
    </div>
  )
}
