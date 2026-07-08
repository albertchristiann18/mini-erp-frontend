import { useState } from 'react'
import { useWarehouses } from '../../hooks/api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { WarehouseFormModal } from '../../components/modals/WarehouseFormModal'
import { Plus, Pencil } from 'lucide-react'
import type { Warehouse } from '../../types/inventory'

export default function WarehousesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Warehouse | undefined>()
  const { data, isLoading } = useWarehouses(page)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} warehouses</span>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Warehouse
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(w => (
              <TableRow key={w.id}>
                <TableCell className="font-medium">{w.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{w.address || '—'}</TableCell>
                <TableCell>
                  <Badge variant={w.is_active ? 'success' : 'secondary'}>
                    {w.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(w); setShowModal(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <WarehouseFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(undefined) }}
        warehouse={editing}
      />
    </div>
  )
}
