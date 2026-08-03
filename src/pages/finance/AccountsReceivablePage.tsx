import { useState } from 'react'
import { useAccountsReceivable } from '../../hooks/api/useFinance'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { SettleReceivableModal } from './SettleReceivableModal'
import { Loading, ErrorState, Empty } from '../../components/ui/queryPrimitives'
import { formatIDR, formatDate } from '../../lib/utils'
import type { ARStatus } from '../../types/finance'
import type { BadgeProps } from '../../components/ui/badge'
import type { ApiError } from '../../lib/errors'

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
  const { data, isLoading, isError, error, refetch } = useAccountsReceivable(page)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  function renderTableBody() {
    if (isLoading) {
      return (
        <TableRow><TableCell colSpan={7}><Loading /></TableCell></TableRow>
      )
    }
    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={7}>
            <ErrorState error={error as unknown as ApiError} onRetry={refetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (!data?.results.length) {
      return (
        <TableRow><TableCell colSpan={7}><Empty message="No receivable records found." /></TableCell></TableRow>
      )
    }
    return data.results.map(ar => (
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
    ))
  }

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
          <TableBody>{renderTableBody()}</TableBody>
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
