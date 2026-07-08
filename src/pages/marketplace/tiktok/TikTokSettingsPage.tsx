import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTikTokShops, createTikTokShop, updateTikTokShop, deleteTikTokShop, refreshTikTokToken } from '../../../api/tiktok'
import type { TikTokShopFormData } from '../../../types/tiktok'
import { toast } from '../../../lib/toast'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input } from '../../../components/ui/input'
import { FormField } from '../../../components/ui/form'
import { Pagination } from '../../../components/Pagination'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../../../components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog'

const PAGE_SIZE = 20

const emptyForm: TikTokShopFormData = {
  company: '',
  shop_id: '',
  shop_name: '',
  app_key: '',
  app_secret: '',
  warehouse: '',
}

export default function TikTokSettingsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<TikTokShopFormData>({ ...emptyForm })

  const { data, isLoading } = useQuery({
    queryKey: ['tiktok-shops', page],
    queryFn: () => listTikTokShops(page),
  })

  const createMutation = useMutation({
    mutationFn: createTikTokShop,
    onSuccess: () => {
      toast.success('Shop created')
      queryClient.invalidateQueries({ queryKey: ['tiktok-shops'] })
      setDialogOpen(false)
      setForm({ ...emptyForm })
    },
    onError: () => toast.error('Failed to create shop'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TikTokShopFormData> }) => updateTikTokShop(id, data),
    onSuccess: () => {
      toast.success('Shop updated')
      queryClient.invalidateQueries({ queryKey: ['tiktok-shops'] })
      setDialogOpen(false)
      setEditId(null)
      setForm({ ...emptyForm })
    },
    onError: () => toast.error('Failed to update shop'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTikTokShop,
    onSuccess: () => {
      toast.success('Shop deleted')
      queryClient.invalidateQueries({ queryKey: ['tiktok-shops'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete shop'),
  })

  const refreshMutation = useMutation({
    mutationFn: refreshTikTokToken,
    onSuccess: () => {
      toast.success('Token refreshed')
      queryClient.invalidateQueries({ queryKey: ['tiktok-shops'] })
    },
    onError: () => toast.error('Failed to refresh token'),
  })

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  const isTokenValid = (expiresAt: string | null) => {
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editId) {
      updateMutation.mutate({ id: editId, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const handleEdit = (shop: { id: string; company: string; shop_id: string; shop_name: string; app_key: string; warehouse: string | null }) => {
    setEditId(shop.id)
    setForm({
      company: shop.company,
      shop_id: shop.shop_id,
      shop_name: shop.shop_name,
      app_key: shop.app_key,
      app_secret: '',
      warehouse: shop.warehouse ?? '',
    })
    setDialogOpen(true)
  }

  const updateField = <K extends keyof TikTokShopFormData>(key: K, value: TikTokShopFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const isMutating = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">TikTok Shop Settings</h1>
        <Button onClick={() => { setEditId(null); setForm({ ...emptyForm }); setDialogOpen(true) }}>Add Shop</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>App Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Token Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : !data?.results.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No shops connected</TableCell>
              </TableRow>
            ) : (
              data.results.map(shop => (
                <TableRow key={shop.id}>
                  <TableCell className="font-medium">{shop.shop_name}</TableCell>
                  <TableCell className="font-mono text-xs">{shop.shop_id}</TableCell>
                  <TableCell className="font-mono text-xs">{shop.app_key}</TableCell>
                  <TableCell>
                    <Badge variant={shop.is_active ? 'success' : 'secondary'}>
                      {shop.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isTokenValid(shop.token_expires_at) ? 'success' : 'destructive'}>
                      {isTokenValid(shop.token_expires_at) ? 'Valid' : 'Expired'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshMutation.mutate(shop.id)}
                        disabled={refreshMutation.isPending}
                      >
                        Refresh Token
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(shop)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteId(shop.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit TikTok Shop' : 'Add TikTok Shop'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Company" required>
              <Input value={form.company} onChange={e => updateField('company', e.target.value)} required />
            </FormField>
            <FormField label="Shop ID" required>
              <Input value={form.shop_id} onChange={e => updateField('shop_id', e.target.value)} required />
            </FormField>
            <FormField label="Shop Name" required>
              <Input value={form.shop_name} onChange={e => updateField('shop_name', e.target.value)} required />
            </FormField>
            <FormField label="App Key" required>
              <Input value={form.app_key} onChange={e => updateField('app_key', e.target.value)} required />
            </FormField>
            <FormField label="App Secret" required={!editId}>
              <Input type="password" value={form.app_secret} onChange={e => updateField('app_secret', e.target.value)} required={!editId} placeholder={editId ? 'Leave blank to keep current' : ''} />
            </FormField>
            <FormField label="Warehouse">
              <Input value={form.warehouse ?? ''} onChange={e => updateField('warehouse', e.target.value)} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? (editId ? 'Updating...' : 'Creating...') : (editId ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Shop</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this shop? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
