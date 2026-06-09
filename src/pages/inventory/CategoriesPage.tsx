import { useState } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCategories, useUpdateCategory } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { CategoryFormModal } from '../../components/modals/CategoryFormModal'
import { toast } from '../../lib/toast'
import type { Category } from '../../types/inventory'

export default function CategoriesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useCategories(params)
  const updateMutation = useUpdateCategory()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-60 pl-8 h-8 text-sm"
              placeholder="Search categories..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
            Search
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} categories</span>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Category
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No categories found</TableCell></TableRow>
            ) : data?.results.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.category_code}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.description || '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? 'success' : 'secondary'}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setShowModal(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({ id: c.id, data: { is_active: !c.is_active } })
                            toast.success(c.is_active ? 'Category deactivated' : 'Category activated')
                          } catch {
                            toast.error('Failed to update category')
                          }
                        }}
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
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
      <CategoryFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(undefined) }}
        category={editing}
      />
    </div>
  )
}
