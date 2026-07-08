import { useState } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCategories, useUpdateCategory, useDeleteCategory } from '../../hooks/api/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { CategoryFormModal } from '../../components/modals/CategoryFormModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { toast } from '../../lib/toast'
import type { Category } from '../../types/inventory'

export default function CategoriesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const [categoryToDelete, setCategoryToDelete] = useState<Category | undefined>()
  const [blockedProducts, setBlockedProducts] = useState<{ name: string; sku_code: string }[]>([])

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useCategories(params)
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
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
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCategoryToDelete(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
      <Dialog open={!!categoryToDelete} onOpenChange={(o) => { if (!o) setCategoryToDelete(undefined) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{categoryToDelete?.name}</span>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(undefined)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!categoryToDelete) return
                try {
                  await deleteMutation.mutateAsync(categoryToDelete.id)
                  toast.success('Category deleted')
                  setCategoryToDelete(undefined)
                } catch (err: unknown) {
                  const data = (err as { response?: { data?: { products?: { name: string; sku_code: string }[] } } })?.response?.data
                  if (data?.products && data.products.length > 0) {
                    setBlockedProducts(data.products)
                    setCategoryToDelete(undefined)
                  } else {
                    toast.error('Failed to delete category')
                  }
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={blockedProducts.length > 0} onOpenChange={(o) => { if (!o) setBlockedProducts([]) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            This category is linked to the following products. Remove the category from these products first:
          </p>
          <ul className="space-y-1">
            {blockedProducts.map(p => (
              <li key={p.sku_code} className="flex items-center justify-between bg-muted px-3 py-1.5 rounded">
                <span className="text-sm">{p.name}</span>
                <span className="text-xs font-mono text-muted-foreground ml-4">{p.sku_code}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setBlockedProducts([])}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
