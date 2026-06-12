import { useState } from 'react'
import { Search, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useMarketplaces, useCreateMarketplace, useUpdateMarketplace } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Pagination } from '../../components/Pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { toast } from '../../lib/toast'
import type { Marketplace } from '../../types/inventory'

export default function MarketplacesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Marketplace | undefined>()
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formActive, setFormActive] = useState(true)

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useMarketplaces(params)
  const createMutation = useCreateMarketplace()
  const updateMutation = useUpdateMarketplace()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const openCreate = () => {
    setEditing(undefined)
    setFormName('')
    setFormUrl('')
    setFormActive(true)
    setShowModal(true)
  }

  const openEdit = (m: Marketplace) => {
    setEditing(m)
    setFormName(m.name)
    setFormUrl(m.url ?? '')
    setFormActive(m.is_active)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: { name: formName.trim(), url: formUrl.trim() || undefined, is_active: formActive },
        })
        toast.success('Marketplace updated')
      } else {
        await createMutation.mutateAsync({ name: formName.trim(), url: formUrl.trim() || undefined, is_active: formActive })
        toast.success('Marketplace created')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save marketplace')
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
              placeholder="Search marketplaces..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
            Search
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} marketplaces</span>
        {user?.is_staff && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Marketplace
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No marketplaces yet</TableCell></TableRow>
            ) : data?.results.map(m => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{m.url || '—'}</TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? 'success' : 'secondary'}>
                    {m.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({ id: m.id, data: { is_active: !m.is_active } })
                            toast.success(m.is_active ? 'Marketplace deactivated' : 'Marketplace activated')
                          } catch {
                            toast.error('Failed to update marketplace')
                          }
                        }}
                      >
                        {m.is_active ? 'Deactivate' : 'Activate'}
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
            <DialogTitle>{editing ? 'Edit Marketplace' : 'New Marketplace'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Marketplace name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input value={formUrl} onChange={e => setFormUrl(e.target.value)} type="url" placeholder="https://example.com" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="rounded" />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
