import { useState } from 'react'
import { useSalesOrders } from '../../hooks/useSales'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { formatIDR, formatDate } from '../../lib/utils'
import type { SOStatus } from '../../types/sales'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<SOStatus, BadgeProps['variant']> = {
  PENDING: 'secondary',
  CONFIRMED: 'info',
  SHIPPING: 'warning',
  DELIVERED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'warning',
}

export default function SalesOrdersPage() {
  const [status, setStatus] = useState<SOStatus | 'ALL'>('ALL')
  const { data, isLoading } = useSalesOrders(status === 'ALL' ? undefined : status)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={status} onValueChange={v => setStatus(v as SOStatus | 'ALL')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {(['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'] as SOStatus[]).map(s => (
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
              <TableHead>Order Number</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Net Revenue</TableHead>
              <TableHead className="text-right">Gross Profit</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(so => (
              <TableRow key={so.id}>
                <TableCell className="font-mono text-xs">{so.order_number}</TableCell>
                <TableCell>{so.marketplace_name ?? so.channel ?? '—'}</TableCell>
                <TableCell><Badge variant={statusVariant[so.status]}>{so.status}</Badge></TableCell>
                <TableCell className="text-right">{formatIDR(so.net_revenue)}</TableCell>
                <TableCell className="text-right">{formatIDR(so.gross_profit)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(so.cdate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
