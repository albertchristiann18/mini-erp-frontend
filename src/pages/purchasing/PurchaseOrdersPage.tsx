import { useState } from 'react'
import { usePurchaseOrders } from '../../hooks/usePurchasing'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { formatIDR, formatDate } from '../../lib/utils'
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
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL')
  const { data, isLoading } = usePurchaseOrders(status === 'ALL' ? undefined : status)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={v => setStatus(v as POStatus | 'ALL')}>
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
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} orders</span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ordered Qty</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(po => (
              <TableRow key={po.id}>
                <TableCell className="font-mono text-xs">{po.purchase_order_number}</TableCell>
                <TableCell>{po.supplier_name || '—'}</TableCell>
                <TableCell><Badge variant={statusVariant[po.status]}>{po.status}</Badge></TableCell>
                <TableCell className="text-right">{po.total_ordered_qty}</TableCell>
                <TableCell className="text-right">{formatIDR(po.total_amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(po.cdate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
