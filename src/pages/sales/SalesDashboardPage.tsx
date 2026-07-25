import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { PlatformBadge } from '../../components/ui/PlatformBadge'
import { formatIDR, formatDate } from '../../lib/utils'
import { Loading, ErrorState, Empty } from '../../components/ui/queryPrimitives'
import { useSalesOrdersFiltered } from '../../hooks/api/useSales'
import { useAvgSales, useAllVariants } from '../../hooks/api/useInventory'
import type { SOStatus } from '../../types/sales'
import type { BadgeProps } from '../../components/ui/badge'
import type { ApiError } from '../../lib/errors'

const statusVariant: Record<SOStatus, BadgeProps['variant']> = {
  PENDING: 'secondary', CONFIRMED: 'info', SHIPPING: 'warning',
  DELIVERED: 'info', COMPLETED: 'success', CANCELLED: 'destructive', RETURNED: 'warning',
}

function defaultDateFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

export default function SalesDashboardPage() {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<SOStatus | 'ALL'>('ALL')
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'SHOPEE' | 'TIKTOK' | 'MANUAL'>('ALL')
  const [page, setPage] = useState(1)
  const [avgDays, setAvgDays] = useState<7 | 30>(30)

  const summaryParams: Record<string, string | number> = { page_size: 500, date_from: dateFrom, date_to: dateTo }
  const { data: summaryData } = useSalesOrdersFiltered(summaryParams)
  const allOrders = useMemo(() => summaryData?.results ?? [], [summaryData])

  const listParams: Record<string, string | number> = { page, page_size: 20, date_from: dateFrom, date_to: dateTo }
  if (statusFilter !== 'ALL') listParams.status = statusFilter
  if (platformFilter !== 'ALL') listParams.source_platform = platformFilter
  const { data: listData, isLoading: listLoading, isError: listError, error: listErrorVal, refetch: listRefetch } = useSalesOrdersFiltered(listParams)
  const totalPages = listData ? Math.ceil(listData.count / 20) : 1

  const { data: variantsData } = useAllVariants()
  const variantIds = useMemo(
    () => (variantsData?.results ?? []).map(v => v.id),
    [variantsData]
  )
  const { data: avgSalesData, isLoading: avgLoading, isError: avgError, error: avgErrorVal, refetch: avgRefetch } = useAvgSales(variantIds, avgDays)

  const totalRevenue = useMemo(
    () => allOrders.reduce((sum, o) => sum + o.net_revenue, 0),
    [allOrders]
  )
  const cancelledCount = useMemo(
    () => allOrders.filter(o => o.status === 'CANCELLED').length,
    [allOrders]
  )
  const cancellationRate = allOrders.length > 0
    ? ((cancelledCount / allOrders.length) * 100).toFixed(1)
    : '0.0'

  const chartData = useMemo(() => {
    const map: Record<string, number> = {}
    allOrders.forEach(o => {
      const day = o.order_date.slice(0, 10)
      map[day] = (map[day] ?? 0) + 1
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }, [allOrders])

  const skuRows = useMemo(() => {
    if (!avgSalesData) return []
    return [...avgSalesData.results].sort((a, b) => b.avg_sales_per_day - a.avg_sales_per_day)
  }, [avgSalesData])

  function renderSkuTableBody() {
    if (avgLoading) {
      return (
        <TableRow>
          <TableCell colSpan={4}><Loading /></TableCell>
        </TableRow>
      )
    }
    if (avgError) {
      return (
        <TableRow>
          <TableCell colSpan={4}>
            <ErrorState error={avgErrorVal as unknown as ApiError} onRetry={avgRefetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (skuRows.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4}><Empty message="No SKU data available." /></TableCell>
        </TableRow>
      )
    }
    return skuRows.map(row => (
      <TableRow key={row.variant_id}>
        <TableCell className="font-mono text-xs">{row.sku_variant_code}</TableCell>
        <TableCell>{row.variant_name}</TableCell>
        <TableCell className="text-right">{row.total_qty_sold}</TableCell>
        <TableCell className="text-right font-medium">{row.avg_sales_per_day.toFixed(2)}</TableCell>
      </TableRow>
    ))
  }

  function renderOrdersTableBody() {
    if (listLoading) {
      return (
        <TableRow>
          <TableCell colSpan={7}><Loading /></TableCell>
        </TableRow>
      )
    }
    if (listError) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <ErrorState error={listErrorVal as unknown as ApiError} onRetry={listRefetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (!listData?.results.length) {
      return (
        <TableRow>
          <TableCell colSpan={7}><Empty message="No orders found." /></TableCell>
        </TableRow>
      )
    }
    return listData.results.map(so => (
      <TableRow key={so.id}>
        <TableCell className="font-mono text-xs">{so.order_number}</TableCell>
        <TableCell className="text-muted-foreground text-xs">{formatDate(so.order_date)}</TableCell>
        <TableCell><Badge variant={statusVariant[so.status]}>{so.status}</Badge></TableCell>
        <TableCell><PlatformBadge platform={so.source_platform} /></TableCell>
        <TableCell className="text-right">{formatIDR(so.net_revenue)}</TableCell>
        <TableCell className="text-right text-muted-foreground">{formatIDR(so.total_cogs)}</TableCell>
        <TableCell className={`text-right font-medium ${so.gross_profit < 0 ? 'text-destructive' : ''}`}>
          {formatIDR(so.gross_profit)}
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold flex-1">Sales Dashboard</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} className="w-36 text-sm" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} className="w-36 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={String(allOrders.length)} />
        <StatCard label="Net Revenue" value={formatIDR(totalRevenue)} />
        <StatCard label="Cancellation Rate" value={`${cancellationRate}%`} highlight={parseFloat(cancellationRate) > 10} />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-base font-semibold mb-4">Daily Orders</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="sku">SKU Performance</TabsTrigger>
          <TabsTrigger value="orders">Order List</TabsTrigger>
        </TabsList>

        <TabsContent value="sku" className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-muted-foreground">AVG window:</span>
            <button
              className={`px-3 py-1 rounded text-sm border ${avgDays === 7 ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => setAvgDays(7)}
            >7 days</button>
            <button
              className={`px-3 py-1 rounded text-sm border ${avgDays === 30 ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => setAvgDays(30)}
            >30 days</button>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU Code</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Total Sold ({avgDays}d)</TableHead>
                  <TableHead className="text-right">AVG Sales/Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderSkuTableBody()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as SOStatus | 'ALL'); setPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {(['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'] as SOStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={v => { setPlatformFilter(v as 'ALL' | 'SHOPEE' | 'TIKTOK' | 'MANUAL'); setPage(1) }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Platforms</SelectItem>
                <SelectItem value="SHOPEE">Shopee</SelectItem>
                <SelectItem value="TIKTOK">TikTok</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">{listData?.count ?? 0} orders</span>
          </div>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderOrdersTableBody()}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={listLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border bg-card p-5 ${highlight ? 'border-destructive' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${highlight ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  )
}
