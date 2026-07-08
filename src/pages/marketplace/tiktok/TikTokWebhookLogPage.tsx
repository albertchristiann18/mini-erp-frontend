import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listTikTokWebhookLogs } from '../../../api/tiktok'
import { Badge } from '../../../components/ui/badge'
import { Pagination } from '../../../components/Pagination'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../../../components/ui/table'

const PAGE_SIZE = 20

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('id-ID')
}

export default function TikTokWebhookLogPage() {
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tiktok-webhook-logs', page],
    queryFn: () => listTikTokWebhookLogs(page),
    refetchInterval: 30_000,
  })

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">TikTok Webhook Logs</h1>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event Type</TableHead>
              <TableHead>Shop</TableHead>
              <TableHead>Processed</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : !data?.results.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No webhook logs found</TableCell>
              </TableRow>
            ) : (
              data.results.map(log => (
                <>
                  <TableRow
                    key={log.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <TableCell>
                      <Badge variant="info">{log.event_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.shop ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={log.processed ? 'success' : 'warning'}>
                        {log.processed ? 'Processed' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.error || '-'}
                    </TableCell>
                    <TableCell>{formatTimestamp(log.cdate)}</TableCell>
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
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
