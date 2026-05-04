import { useState } from 'react'
import { useStockMovements } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { BulkStockModal } from '../../components/modals/BulkStockModal'
import { formatDate } from '../../lib/utils'
import type { BadgeProps } from '../../components/ui/badge'
import type { StockMovement } from '../../types/inventory'
import { Upload } from 'lucide-react'

const movementVariant: Record<StockMovement['movement_type'], BadgeProps['variant']> = {
  PURCHASE: 'info',
  INBOUND: 'success',
  OUTBOUND: 'destructive',
  RETURN: 'warning',
  ADJUSTMENT: 'secondary',
  TRANSFER: 'secondary',
}

export default function StockPage() {
  const [page, setPage] = useState(1)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const { user } = useAuth()
  const { data, isLoading } = useStockMovements({ page, page_size: 20 })
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} movements</span>
        {user?.is_staff && (
          <Button size="sm" variant="outline" onClick={() => setShowBulkModal(true)}>
            <Upload className="h-4 w-4 mr-1" /> Bulk Stock Update
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.product_variant_name}</TableCell>
                <TableCell>{m.warehouse_name}</TableCell>
                <TableCell>
                  <Badge variant={movementVariant[m.movement_type]}>{m.movement_type}</Badge>
                </TableCell>
                <TableCell className="text-right">{m.quantity}</TableCell>
                <TableCell className="text-right">{m.balance_after}</TableCell>
                <TableCell className="font-mono text-xs">{m.reference_number || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(m.cdate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <BulkStockModal open={showBulkModal} onClose={() => setShowBulkModal(false)} />
    </div>
  )
}
