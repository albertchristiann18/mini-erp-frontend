import { useState } from 'react'
import { useSalesOrders, useConfirmSalesOrder, useCancelSalesOrder } from '../../hooks/useSales'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { SalesOrderFormModal } from '../../components/modals/SalesOrderFormModal'
import { PlatformBadge } from '../../components/ui/PlatformBadge'
import { formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
import { Plus } from 'lucide-react'
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
  const { user } = useAuth()
  const [status, setStatus] = useState<SOStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = useSalesOrders(status === 'ALL' ? undefined : status, page)
  const confirmMutation = useConfirmSalesOrder()
  const cancelMutation = useCancelSalesOrder()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const handleConfirm = async (id: string) => {
    try {
      await confirmMutation.mutateAsync(id)
      toast.success('Order confirmed')
    } catch {
      toast.error('Failed to confirm order')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id)
      toast.success('Order cancelled')
    } catch {
      toast.error('Failed to cancel order')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={status} onValueChange={v => { setStatus(v as SOStatus | 'ALL'); setPage(1) }}>
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
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Order
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Net Revenue</TableHead>
              <TableHead className="text-right">Gross Profit</TableHead>
              <TableHead>Date</TableHead>
              {user?.is_staff && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(so => (
              <TableRow key={so.id}>
                <TableCell className="font-mono text-xs">{so.order_number}</TableCell>
                <TableCell><PlatformBadge platform={so.source_platform ?? 'MANUAL'} /></TableCell>
                <TableCell>—</TableCell>
                <TableCell><Badge variant={statusVariant[so.status]}>{so.status}</Badge></TableCell>
                <TableCell className="text-right">{formatIDR(so.net_revenue)}</TableCell>
                <TableCell className="text-right">{formatIDR(so.gross_profit)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(so.cdate)}</TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {so.status === 'PENDING' && (
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                          onClick={() => handleConfirm(so.id)}
                          disabled={confirmMutation.isPending}
                        >
                          Confirm
                        </Button>
                      )}
                      {!['COMPLETED', 'CANCELLED', 'RETURNED'].includes(so.status) && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-500 hover:text-red-600"
                          onClick={() => handleCancel(so.id)}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <SalesOrderFormModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
