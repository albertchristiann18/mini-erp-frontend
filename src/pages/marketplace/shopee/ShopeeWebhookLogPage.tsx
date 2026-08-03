import { useState } from 'react'
import { useShopeeWebhookLogs } from '../../../hooks/api/useMarketplace'
import { Badge } from '../../../components/ui/badge'
import { Pagination } from '../../../components/Pagination'
import { Loading, ErrorState, Empty } from '../../../components/ui/queryPrimitives'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../../../components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../../components/ui/select'
import type { ApiError } from '../../../lib/errors'

const PAGE_SIZE = 20

const EVENT_LABELS: Record<number, string> = {
  3: 'Order Update',
  4: 'Shop Update',
}

function getEventLabel(eventType: number) {
  return EVENT_LABELS[eventType] ?? 'Unknown'
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('id-ID')
}

export default function ShopeeWebhookLogPage() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useShopeeWebhookLogs(page, filter)

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1)
  }

  function renderTableBody() {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={5}><Loading /></TableCell>
        </TableRow>
      )
    }
    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={5}>
            <ErrorState error={error as ApiError} onRetry={refetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (!data?.results.length) {
      return (
        <TableRow>
          <TableCell colSpan={5}><Empty message="No webhook logs found" /></TableCell>
        </TableRow>
      )
    }
    return data.results.map(log => (
      <>
        <TableRow
          key={log.id}
          className="cursor-pointer"
          onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
        >
          <TableCell>{formatTimestamp(log.created_at)}</TableCell>
          <TableCell className="font-mono text-xs">{log.shop}</TableCell>
          <TableCell>
            <Badge variant="info">{getEventLabel(log.event_type)}</Badge>
          </TableCell>
          <TableCell>
            <Badge variant={log.processed ? 'success' : 'warning'}>
              {log.processed ? 'Processed' : 'Pending'}
            </Badge>
          </TableCell>
          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
            {log.error_message ?? '-'}
          </TableCell>
        </TableRow>
        {expandedId === log.id && (
          <TableRow key={`${log.id}-payload`}>
            <TableCell colSpan={5}>
              <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </TableCell>
          </TableRow>
        )}
      </>
    ))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Webhook Logs</h1>
        <div className="w-48">
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="false">Unprocessed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Error Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
