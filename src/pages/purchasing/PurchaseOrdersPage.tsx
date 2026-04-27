import { useState } from 'react'
import { usePurchaseOrders, useAdvancePOStatus } from '../../hooks/usePurchasing'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { PurchaseOrderFormModal } from '../../components/modals/PurchaseOrderFormModal'
import { formatIDR, formatDate } from '../../lib/utils'
import { toast } from '../../lib/toast'
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

const PO_TRANSITIONS: Record<POStatus, POStatus | null> = {
  DRAFT: 'ORDERED',
  ORDERED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<POStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = usePurchaseOrders(status === 'ALL' ? undefined : status, page)
  const advanceMutation = useAdvancePOStatus()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const handleAdvance = async (id: string, nextStatus: string) => {
    try {
      await advanceMutation.mutateAsync({ id, status: nextStatus })
      toast.success(`Status updated to ${nextStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await advanceMutation.mutateAsync({ id, status: 'CANCELLED' })
      toast.success('Purchase order cancelled')
    } catch {
      toast.error('Failed to cancel order')
    }
  }

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
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Date</TableHead>
              {user?.is_staff && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(po => {
              const nextStatus = PO_TRANSITIONS[po.status]
              return (
                <TableRow key={po.id}>
                  <TableCell className="font-mono text-xs">{po.purchase_order_number}</TableCell>
                  <TableCell>{po.supplier_name || '—'}</TableCell>
                  <TableCell><Badge variant={statusVariant[po.status]}>{po.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatIDR(po.total_amount)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(po.cdate)}</TableCell>
                  {user?.is_staff && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {nextStatus && (
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                            onClick={() => handleAdvance(po.id, nextStatus)}
                            disabled={advanceMutation.isPending}
                          >
                            → {nextStatus}
                          </Button>
                        )}
                        {po.status !== 'COMPLETED' && po.status !== 'CANCELLED' && (
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-500 hover:text-red-600"
                            onClick={() => handleCancel(po.id)}
                            disabled={advanceMutation.isPending}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <PurchaseOrderFormModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
