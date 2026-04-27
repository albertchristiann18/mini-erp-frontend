import { useAccountsReceivable } from '../../hooks/useFinance'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { formatIDR, formatDate } from '../../lib/utils'
import type { ARStatus } from '../../types/finance'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<ARStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  PARTIAL: 'info',
  SETTLED: 'success',
}

export default function AccountsReceivablePage() {
  const { data: receivables, isLoading } = useAccountsReceivable()

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Settled</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
          ) : receivables?.map(ar => (
            <TableRow key={ar.id}>
              <TableCell className="font-mono text-xs">{ar.order_number}</TableCell>
              <TableCell><Badge variant={statusVariant[ar.status]}>{ar.status}</Badge></TableCell>
              <TableCell className="text-right">{formatIDR(ar.expected_amount)}</TableCell>
              <TableCell className="text-right">{formatIDR(ar.settled_amount)}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{ar.due_date ? formatDate(ar.due_date) : '—'}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{formatDate(ar.cdate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
