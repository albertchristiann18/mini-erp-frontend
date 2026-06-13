import { useState } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useBusinessEntities, useCompanyMarketplaces, useCreateBusinessEntity, useUpdateBusinessEntity } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from '../../lib/toast'
import type { BusinessEntity } from '../../types/inventory'

export default function BusinessEntitiesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BusinessEntity | undefined>()
  const [formName, setFormName] = useState('')
  const [formMarketplace, setFormMarketplace] = useState('')
  const [formActive, setFormActive] = useState(true)

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useBusinessEntities(params)
  const { data: marketplaceData } = useCompanyMarketplaces({ page_size: 100 })
  const createMutation = useCreateBusinessEntity()
  const updateMutation = useUpdateBusinessEntity()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const marketplaces = marketplaceData?.results ?? []

  const openCreate = () => {
    setEditing(undefined)
    setFormName('')
    setFormMarketplace('')
    setFormActive(true)
    setShowModal(true)
  }

  const openEdit = (be: BusinessEntity) => {
    setEditing(be)
    setFormName(be.name)
    setFormMarketplace(be.marketplace_id)
    setFormActive(be.is_active)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formMarketplace) return
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { name: formName.trim(), marketplace_id: formMarketplace, is_active: formActive },
        })
        toast.success('Business entity updated')
      } else {
        await createMutation.mutateAsync({ name: formName.trim(), marketplace_id: formMarketplace, is_active: formActive })
        toast.success('Business entity created')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save business entity')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-60 pl-8 h-8 text-sm"
              placeholder="Search business entities..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
            Search
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} business entities</span>
        {user?.is_staff && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Business Entity
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Marketplace</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No business entities yet</TableCell></TableRow>
            ) : data?.results.map(be => (
              <TableRow key={be.id}>
                <TableCell className="font-medium">{be.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{be.marketplace_name}</TableCell>
                <TableCell>
                  <Badge variant={be.is_active ? 'success' : 'secondary'}>
                    {be.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(be)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({ id: be.id, data: { is_active: !be.is_active } })
                            toast.success(be.is_active ? 'Business entity deactivated' : 'Business entity activated')
                          } catch {
                            toast.error('Failed to update business entity')
                          }
                        }}
                      >
                        {be.is_active ? 'Deactivate' : 'Activate'}
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
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) setShowModal(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Business Entity' : 'New Business Entity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Business entity name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marketplace <span className="text-destructive">*</span></label>
              <Select value={formMarketplace} onValueChange={setFormMarketplace}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a marketplace" />
                </SelectTrigger>
                <SelectContent>
                  {marketplaces.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded" />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || !formMarketplace || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
