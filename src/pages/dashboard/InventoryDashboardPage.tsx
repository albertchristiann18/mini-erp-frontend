import { useState, useMemo } from 'react'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { useInventorySummary, useAvgSales } from '../../hooks/useInventory'
import { Pagination } from '../../components/Pagination'

const formatIDR = (val: number) =>
  val.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

function computeMargin(basePrice: number, cogs: number): number | null {
  if (basePrice <= 0) return null
  return (basePrice - cogs) / basePrice
}

function computeDOI(qty: number, avgSalesPerDay: number): number | null {
  if (avgSalesPerDay <= 0) return qty === 0 ? 0 : null
  return qty / avgSalesPerDay
}

function doiStatus(doi: number | null, qty: number): 'oos' | 'overstock' | 'ok' | 'unknown' {
  if (qty === 0) return 'oos'
  if (doi === null) return 'unknown'
  if (doi > 90) return 'overstock'
  return 'ok'
}

export default function InventoryDashboardPage() {
  const [days, setDays] = useState<7 | 30>(30)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  const { data: summaryData, isLoading } = useInventorySummary()
  const allVariantIds = useMemo(
    () => summaryData?.products.flatMap(p => p.variants.map(v => v.variant_id)) ?? [],
    [summaryData]
  )
  const { data: avgSalesData } = useAvgSales(allVariantIds, days)

  const avgSalesMap = useMemo(() => {
    const map: Record<string, number> = {}
    avgSalesData?.results?.forEach((r: { variant_id: string; avg_sales_per_day: number }) => {
      map[r.variant_id] = r.avg_sales_per_day
    })
    return map
  }, [avgSalesData])

  const commitSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const filteredProducts = useMemo(() => {
    if (!summaryData) return []
    const q = search.toLowerCase().trim()
    let products = summaryData.products
    if (q) {
      products = products.filter(p =>
        p.product_name.toLowerCase().includes(q) ||
        p.sku_code.toLowerCase().includes(q) ||
        p.variants.some(v =>
          v.sku_variant_code.toLowerCase().includes(q) ||
          v.variant_name.toLowerCase().includes(q)
        )
      )
    }
    return [...products].sort((a, b) => {
      const aQty = a.variants.reduce((s, v) => s + v.total_qty, 0)
      const bQty = b.variants.reduce((s, v) => s + v.total_qty, 0)
      return bQty - aQty
    })
  }, [summaryData, search])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalCogsStock = summaryData?.summary.total_cogs_stock ?? 0
  const totalSellingPrice = summaryData?.summary.total_selling_price ?? 0
  const warehouses = summaryData?.warehouses ?? []

  return (
    <div className="space-y-4">
      {summaryData && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total COGS Stock</p>
            <p className="text-xl font-bold tabular-nums">{formatIDR(totalCogsStock)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total Selling Price</p>
            <p className="text-xl font-bold tabular-nums">{formatIDR(totalSellingPrice)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Products</p>
            <p className="text-xl font-bold tabular-nums">{summaryData?.summary.total_products}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Variants</p>
            <p className="text-xl font-bold tabular-nums">{summaryData?.summary.total_variants}</p>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search product or SKU..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitSearch() }}
          className="w-[280px]"
        />
        <Button variant="default" size="sm" onClick={commitSearch}>Search</Button>
        <div className="flex rounded-md border overflow-hidden">
          <button onClick={() => setDays(7)} className={days === 7 ? 'px-3 py-1.5 text-sm bg-primary text-primary-foreground' : 'px-3 py-1.5 text-sm bg-background hover:bg-muted'}>7d</button>
          <button onClick={() => setDays(30)} className={days === 30 ? 'px-3 py-1.5 text-sm bg-primary text-primary-foreground' : 'px-3 py-1.5 text-sm bg-background hover:bg-muted'}>30d</button>
        </div>
        <span className="text-sm text-muted-foreground">{filteredProducts.length} products</span>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="w-12 p-2"></th>
              <th className="text-left p-2 w-48">Product</th>
              <th className="text-left p-2">Variant</th>
              <th className="text-right p-2">Total QTY</th>
              {warehouses.map(w => <th key={w.id} className="text-right p-2">{w.name}</th>)}
              <th className="text-right p-2">AVG Sales</th>
              <th className="text-right p-2">DOI</th>
              <th className="text-right p-2">Status</th>
              <th className="text-right p-2">COGS</th>
              <th className="text-right p-2">Sell Price</th>
              <th className="text-right p-2">Margin</th>
              <th className="text-right p-2">COGS Total</th>
              <th className="text-right p-2">SP Total</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.flatMap(product =>
            product.variants.map((v, variantIndex) => {
              const isFirst = variantIndex === 0
              const avg = avgSalesMap[v.variant_id] ?? 0
              const doi = computeDOI(v.total_qty, avg)
              const status = doiStatus(doi, v.total_qty)
              const margin = computeMargin(v.base_price, v.current_cogs)

              return (
                <tr key={v.variant_id} className={isFirst ? 'border-t-2 border-border hover:bg-muted/20' : 'hover:bg-muted/20'}>
                  {isFirst && (
                    <td className="p-2 align-top" rowSpan={product.variants.length}>
                      {product.photo_url
                        ? <img src={product.photo_url} alt="" className="h-8 w-8 rounded object-cover" />
                        : <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">?</div>
                      }
                    </td>
                  )}
                  {isFirst && (
                    <td className="p-2 font-medium align-top" rowSpan={product.variants.length}>
                      <div>{product.product_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{product.sku_code}</div>
                    </td>
                  )}
                  <td className="p-2">
                    <div className="text-muted-foreground text-sm">{v.variant_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{v.sku_variant_code}</div>
                  </td>
                  <td className="p-2 text-right tabular-nums">{v.total_qty.toLocaleString()}</td>
                  {warehouses.map(w => (
                    <td key={w.id} className="p-2 text-right tabular-nums text-muted-foreground">
                      {(v.warehouse_stocks[w.id] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="p-2 text-right tabular-nums text-muted-foreground">
                    {avg > 0 ? avg.toFixed(2) : '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {doi !== null ? Math.round(doi).toLocaleString() : '—'}
                  </td>
                  <td className="p-2 text-right">
                    {status === 'oos' && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">OOS</span>
                    )}
                    {status === 'overstock' && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Overstock</span>
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">{v.current_cogs > 0 ? formatIDR(v.current_cogs) : '—'}</td>
                  <td className="p-2 text-right tabular-nums">{v.base_price > 0 ? formatIDR(v.base_price) : '—'}</td>
                  <td className={`p-2 text-right tabular-nums font-medium ${margin !== null && margin < 0.2 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {margin !== null ? `${(margin * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums text-muted-foreground">
                    {v.current_cogs > 0 ? formatIDR(v.current_cogs * v.total_qty) : '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums text-muted-foreground">
                    {v.base_price > 0 ? formatIDR(v.base_price * v.total_qty) : '—'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      {isLoading && <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>}
      {!isLoading && filteredProducts.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">No products found</div>
      )}
    </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={p => setPage(p)}
        isLoading={isLoading}
      />
    </div>
  )
}
