import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts, useCategories } from '../../hooks/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Pagination } from '../../components/Pagination'
import { BulkProductModal } from '../../components/modals/BulkProductModal'
import { Plus, Upload, Pencil, Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { Product } from '../../types/inventory'

function SortIcon({ col, ordering }: { col: 'name' | 'sku_code', ordering: string }) {
  if (ordering === col) return <ArrowUp className="h-3.5 w-3.5 ml-1 inline" />
  if (ordering === `-${col}`) return <ArrowDown className="h-3.5 w-3.5 ml-1 inline" />
  return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />
}

export default function ProductsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [ordering, setOrdering] = useState<string>('')
  const [showBulkModal, setShowBulkModal] = useState(false)

  const { data: categoriesData } = useCategories({ page_size: 100 })
  const { data, isLoading } = useProducts(page, 20, search || undefined, categoryFilter || undefined, ordering || undefined)
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const handleView = (product: Product) => {
    navigate(`/inventory/products/${product.id}`)
  }

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const handleSortHeader = (col: 'name' | 'sku_code') => {
    setOrdering(prev => prev === col ? `-${col}` : prev === `-${col}` ? '' : col)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Input
              placeholder="Search by name or SKU..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-[280px]"
            />
            <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
          </div>
          <Select
            value={categoryFilter || '__all'}
            onValueChange={v => { setCategoryFilter(v === '__all' ? '' : v); setPage(1) }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All Categories</SelectItem>
              {categoriesData?.results?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">{data?.count ?? 0} products</span>
        </div>
        {user?.is_staff && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowBulkModal(true)}>
              <Upload className="h-4 w-4 mr-1" /> Bulk Import
            </Button>
            <Button size="sm" onClick={() => navigate('/inventory/products/new')}>
              <Plus className="h-4 w-4 mr-1" /> New Product
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSortHeader('name')}>
                Name <SortIcon col="name" ordering={ordering} />
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSortHeader('sku_code')}>
                SKU <SortIcon col="sku_code" ordering={ordering} />
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.sku_code}</TableCell>
                <TableCell>{p.category_name}</TableCell>
                <TableCell>
                  <Badge variant={p.is_active ? 'success' : 'secondary'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleView(p)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {user?.is_staff && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => navigate(`/inventory/products/${p.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
      <BulkProductModal open={showBulkModal} onClose={() => setShowBulkModal(false)} />
    </div>
  )
}