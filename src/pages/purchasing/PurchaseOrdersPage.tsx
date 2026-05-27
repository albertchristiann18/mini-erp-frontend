import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePurchaseOrdersFiltered } from '../../hooks/usePurchasing'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { PurchaseOrderFormModal } from '../../components/modals/PurchaseOrderFormModal'
import { formatIDR, formatDate } from '../../lib/utils'
import { Plus } from 'lucide-react'
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

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [forwarderFilter, setForwarderFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const queryParams: Record<string, string | number> = { page, page_size: 20 }
  if (status !== 'ALL') queryParams.status = status
  if (dateFrom) queryParams.date_from = dateFrom
  if (dateTo) queryParams.date_to = dateTo
  if (forwarderFilter) queryParams.forwarder = forwarderFilter

  const { data, isLoading } = usePurchaseOrdersFiltered(queryParams)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={v => { setStatus(v as POStatus | 'ALL'); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
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
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="w-40"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="w-40"
          />
          <Input
            placeholder="Forwarder..."
            value={forwarderFilter}
            onChange={e => { setForwarderFilter(e.target.value); setPage(1) }}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">{data?.count ?? 0} orders</span>
        </div>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New PO
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice Date</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Forecast Delivery</TableHead>
              <TableHead>Forwarder</TableHead>
              <TableHead className="text-right">Exchange Rate</TableHead>
              <TableHead className="text-right">CBM</TableHead>
              <TableHead className="text-right">QTY</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">COGS</TableHead>
              <TableHead className="text-right">Ship/QTY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(po => (
              <TableRow key={po.id}>
                <TableCell>
                  <button
                    className="font-mono text-xs text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/purchasing/orders/${po.id}`)}
                  >
                    {po.purchase_order_number}
                  </button>
                </TableCell>
                <TableCell><Badge variant={statusVariant[po.status]}>{po.status}</Badge></TableCell>
                <TableCell className="text-xs">{po.invoice_date ? formatDate(po.invoice_date) : '—'}</TableCell>
                <TableCell className="text-xs">{po.delivery_date ? formatDate(po.delivery_date) : '—'}</TableCell>
                <TableCell className="text-xs">{po.forecast_delivery_date ? formatDate(po.forecast_delivery_date) : '—'}</TableCell>
                <TableCell className="text-xs">{po.forwarder_name || '—'}</TableCell>
                <TableCell className="text-right text-xs">{po.exchange_rate ?? '—'}</TableCell>
                <TableCell className="text-right text-xs">
                  {po.cbm ?? (po.forecast_cbm ? `${po.forecast_cbm} (est.)` : '—')}
                </TableCell>
                <TableCell className="text-right">{po.total_ordered_qty}</TableCell>
                <TableCell className="text-right">{formatIDR(po.total_amount)}</TableCell>
                <TableCell className="text-right">{po.cost_ratio_cogs.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{formatIDR(po.shipping_per_qty)}</TableCell>
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
