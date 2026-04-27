import { useAccountsPayable } from '../../hooks/useFinance'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { formatIDR, formatDate } from '../../lib/utils'
import type { APStatus } from '../../types/finance'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<APStatus, BadgeProps['variant']> = {
  UNPAID: 'destructive',
  PARTIAL: 'warning',
  PAID: 'success',
}

export default function AccountsPayablePage() {
  const { data: payables, isLoading } = useAccountsPayable()

  return (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
          ) : payables?.map(ap => (
            <TableRow key={ap.id}>
              <TableCell className="font-mono text-xs">{ap.purchase_order_number}</TableCell>
              <TableCell>{ap.supplier_name}</TableCell>
              <TableCell><Badge variant={statusVariant[ap.status]}>{ap.status}</Badge></TableCell>
              <TableCell className="text-right">{formatIDR(ap.total_amount)}</TableCell>
              <TableCell className="text-right">{formatIDR(ap.paid_amount)}</TableCell>
              <TableCell className="text-right font-medium">{formatIDR(ap.remaining_amount)}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{ap.due_date ? formatDate(ap.due_date) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
