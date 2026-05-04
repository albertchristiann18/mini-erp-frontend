import { useState } from 'react'
import { useProducts } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Pagination } from '../../components/Pagination'
import { ProductFormModal } from '../../components/modals/ProductFormModal'
import { BulkProductModal } from '../../components/modals/BulkProductModal'
import { Plus, Upload } from 'lucide-react'

export default function ProductsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const { data, isLoading } = useProducts(page)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} products</span>
        {user?.is_staff && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulkModal(true)}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Import
            </Button>
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Product
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                <TableCell>{p.category_name}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'success' : 'secondary'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <ProductFormModal open={showModal} onClose={() => setShowModal(false)} />
      <BulkProductModal open={showBulkModal} onClose={() => setShowBulkModal(false)} />
    </div>
  )
}
