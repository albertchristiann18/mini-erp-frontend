import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePurchaseOrdersFiltered, usePurchaseOrderSummary } from '../../hooks/usePurchasing'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { PurchaseOrderFormModal } from '../../components/modals/PurchaseOrderFormModal'
import { cn, formatIDR, formatDate } from '../../lib/utils'
import { Plus, ChevronUp, ChevronDown } from 'lucide-react'
import type { POStatus } from '../../types/purchasing'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<POStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary',
  ORDERED: 'info',
  SHIPPED: 'warning',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
}

function SortableHead({
  field,
  label,
  ordering,
  onSort,
  className,
}: {
  field: string
  label: string
  ordering: string
  onSort: (field: string) => void
  className?: string
}) {
  const isActive = ordering === field || ordering === `-${field}`
  const isDesc = ordering === `-${field}`
  return (
    <TableHead
      className={cn('cursor-pointer select-none', className)}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (isDesc ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
      </span>
    </TableHead>
  )
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pendingStatus, setPendingStatus] = useState<POStatus | 'ALL'>('ALL')
  const [pendingDateFrom, setPendingDateFrom] = useState('')
  const [pendingDateTo, setPendingDateTo] = useState('')
  const [appliedStatus, setAppliedStatus] = useState<POStatus | 'ALL'>('ALL')
  const [appliedDateFrom, setAppliedDateFrom] = useState('')
  const [appliedDateTo, setAppliedDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [ordering, setOrdering] = useState('-cdate')
  const [showModal, setShowModal] = useState(false)

  const handleApply = () => {
    setAppliedStatus(pendingStatus)
    setAppliedDateFrom(pendingDateFrom)
    setAppliedDateTo(pendingDateTo)
    setPage(1)
  }

  const queryParams: Record<string, string | number> = { page, page_size: pageSize, ordering }
  if (appliedStatus !== 'ALL') queryParams.status = appliedStatus
  if (appliedDateFrom) queryParams.date_from = appliedDateFrom
  if (appliedDateTo) queryParams.date_to = appliedDateTo

  const { data, isLoading } = usePurchaseOrdersFiltered(queryParams)
  const totalPages = data ? Math.ceil(data.count / pageSize) : 1

  const summaryParams: Record<string, string> = {}
  if (appliedDateFrom) summaryParams.date_from = appliedDateFrom
  if (appliedDateTo) summaryParams.date_to = appliedDateTo
  const { data: summary } = usePurchaseOrderSummary(summaryParams)

  const handleSort = (field: string) => {
    setOrdering(prev => prev === `-${field}` ? field : `-${field}`)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={pendingStatus} onValueChange={v => setPendingStatus(v as POStatus | 'ALL')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              {(['DRAFT', 'ORDERED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'] as POStatus[]).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={pendingDateFrom}
            onChange={e => setPendingDateFrom(e.target.value)}
            className="w-36"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={pendingDateTo}
            onChange={e => setPendingDateTo(e.target.value)}
            className="w-36"
          />
          <Button size="sm" onClick={handleApply}>Apply</Button>
          <span className="text-sm text-muted-foreground">{data?.count ?? 0} orders</span>
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New PO
          </Button>
        )}
      </div>

      {summary && summary.upcoming_count > 0 && (
        <div className="rounded-lg border bg-card px-5 py-3 flex items-center gap-8">
          <div>
            <p className="text-xs text-muted-foreground">Upcoming POs</p>
            <p className="text-lg font-semibold">{summary.upcoming_count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Goods (IDR)</p>
            <p className="text-lg font-semibold">{formatIDR(summary.upcoming_total_item_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Procure Amount (IDR)</p>
            <p className="text-lg font-semibold">{formatIDR(summary.upcoming_procure_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Upcoming Value</p>
            <p className="text-lg font-semibold text-primary">{formatIDR(summary.upcoming_total_amount)}</p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="purchase_order_number" label="PO Number" ordering={ordering} onSort={handleSort} />
              <TableHead>Status</TableHead>
              <SortableHead field="invoice_date" label="Invoice Date" ordering={ordering} onSort={handleSort} />
              <SortableHead field="delivery_date" label="Delivery Date" ordering={ordering} onSort={handleSort} />
              <TableHead className="text-right">Exch. Rate</TableHead>
              <TableHead className="text-right">CBM</TableHead>
              <SortableHead field="total_ordered_qty" label="QTY" ordering={ordering} onSort={handleSort} className="text-right" />
              <SortableHead field="total_item_amount" label="Goods" ordering={ordering} onSort={handleSort} className="text-right" />
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Supplier Delivery</TableHead>
              <SortableHead field="shipping_fee" label="Freight" ordering={ordering} onSort={handleSort} className="text-right" />
              <TableHead className="text-right">Ship/QTY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(po => (
              <TableRow
                key={po.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/purchasing/orders/${po.id}`)}
              >
                <TableCell className="font-mono text-xs font-medium">{po.purchase_order_number}</TableCell>
                <TableCell><Badge variant={statusVariant[po.status]}>{po.status}</Badge></TableCell>
                <TableCell className="text-xs">{po.invoice_date ? formatDate(po.invoice_date) : '—'}</TableCell>
                <TableCell className="text-xs">{po.delivery_date ? formatDate(po.delivery_date) : '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.exchange_rate ?? '—'}</TableCell>
                <TableCell className="text-right text-xs">
                  {po.cbm ?? (po.forecast_cbm ? `${po.forecast_cbm}*` : '—')}
                </TableCell>
                <TableCell className="text-right">{po.total_ordered_qty}</TableCell>
                <TableCell className="text-right text-xs">{po.total_item_amount != null ? formatIDR(po.total_item_amount) : '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.total_amount != null ? formatIDR(po.total_amount) : '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.delivery_fee_idr != null ? formatIDR(po.delivery_fee_idr) : '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.shipping_fee != null ? formatIDR(po.shipping_fee) : '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.shipping_per_qty != null ? formatIDR(po.shipping_per_qty) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <PurchaseOrderFormModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
