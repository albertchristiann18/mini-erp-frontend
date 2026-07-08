import { useState } from 'react'
import { useAccountsReceivable } from '../../hooks/api/useFinance'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { SettleReceivableModal } from '../../components/modals/SettleReceivableModal'
import { formatIDR, formatDate } from '../../lib/utils'
import type { ARStatus } from '../../types/finance'
import type { BadgeProps } from '../../components/ui/badge'

const statusVariant: Record<ARStatus, BadgeProps['variant']> = {
  PENDING: 'warning',
  PARTIAL: 'info',
  SETTLED: 'success',
}

interface SettlingState { id: string; expected: number; settled: number }

export default function AccountsReceivablePage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [settling, setSettling] = useState<SettlingState | null>(null)
  const { data, isLoading } = useAccountsReceivable(page)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
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
              {user?.is_staff && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(ar => (
              <TableRow key={ar.id}>
                <TableCell className="font-mono text-xs">{ar.order_number}</TableCell>
                <TableCell><Badge variant={statusVariant[ar.status]}>{ar.status}</Badge></TableCell>
                <TableCell className="text-right">{formatIDR(ar.expected_amount)}</TableCell>
                <TableCell className="text-right">{formatIDR(ar.settled_amount)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{ar.due_date ? formatDate(ar.due_date) : '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(ar.cdate)}</TableCell>
                {user?.is_staff && (
                  <TableCell>
                    {ar.status !== 'SETTLED' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                        onClick={() => setSettling({ id: ar.id, expected: ar.expected_amount, settled: ar.settled_amount })}
                      >
                        Settle
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
      {settling && (
        <SettleReceivableModal
          open={!!settling}
          onClose={() => setSettling(null)}
          arId={settling.id}
          expectedAmount={settling.expected}
          settledAmount={settling.settled}
        />
      )}
    </div>
  )
}
