import { useState } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSuppliers, useUpdateSupplier } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { SupplierFormModal } from '../../components/modals/SupplierFormModal'
import { toast } from '../../lib/toast'
import type { Supplier } from '../../types/inventory'

export default function SuppliersPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>()

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useSuppliers(params)
  const updateMutation = useUpdateSupplier()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-60 pl-8 h-8 text-sm"
              placeholder="Search suppliers..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
            Search
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} suppliers</span>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Supplier
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Supplier Link</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No suppliers found</TableCell></TableRow>
            ) : data?.results.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.contact_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.phone || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.country || '—'}</TableCell>
                <TableCell>
                  {s.supplier_link
                    ? <a href={s.supplier_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate max-w-[180px] block">{s.supplier_link}</a>
                    : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? 'success' : 'secondary'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setShowModal(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({ id: s.id, data: { is_active: !s.is_active } })
                            toast.success(s.is_active ? 'Supplier deactivated' : 'Supplier activated')
                          } catch {
                            toast.error('Failed to update supplier')
                          }
                        }}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <SupplierFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(undefined) }}
        supplier={editing}
      />
    </div>
  )
}


