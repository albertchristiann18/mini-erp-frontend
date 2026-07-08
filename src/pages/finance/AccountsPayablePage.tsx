import { useState } from 'react'
import { useAccountsPayable } from '../../hooks/api/useFinance'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { RecordPaymentModal } from '../../components/modals/RecordPaymentModal'
import { formatIDR, formatDate } from '../../lib/utils'
import type { APStatus } from '../../types/finance'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<APStatus, BadgeProps['variant']> = {
  UNPAID: 'destructive',
  PARTIAL: 'warning',
  PAID: 'success',
}

export default function AccountsPayablePage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payingRemaining, setPayingRemaining] = useState(0)
  const { data, isLoading } = useAccountsPayable(page)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Due Date</TableHead>
              {user?.is_staff && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(ap => (
              <TableRow key={ap.id}>
                <TableCell className="font-mono text-xs">{ap.purchase_order_number}</TableCell>
                <TableCell>{ap.supplier_name}</TableCell>
                <TableCell><Badge variant={statusVariant[ap.status]}>{ap.status}</Badge></TableCell>
                <TableCell className="text-right">{formatIDR(ap.total_amount)}</TableCell>
                <TableCell className="text-right">{formatIDR(ap.paid_amount)}</TableCell>
                <TableCell className="text-right font-medium">{formatIDR(ap.remaining_amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{ap.due_date ? formatDate(ap.due_date) : '—'}</TableCell>
                {user?.is_staff && (
                  <TableCell>
                    {ap.status !== 'PAID' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => { setPayingId(ap.id); setPayingRemaining(ap.remaining_amount) }}
                      >
                        Pay
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      {payingId && (
        <RecordPaymentModal
          open={!!payingId}
          onClose={() => setPayingId(null)}
          apId={payingId}
          remainingAmount={payingRemaining}
        />
      )}
    </div>
  )
}
