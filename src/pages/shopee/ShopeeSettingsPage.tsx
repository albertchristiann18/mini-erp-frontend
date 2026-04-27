import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listShops, createShop, deleteShop, triggerSync } from '../../api/shopee'
import type { CreateShopPayload } from '../../types/shopee'
import { toast } from '../../lib/toast'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { FormField } from '../../components/ui/form'
import { Pagination } from '../../components/Pagination'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../../components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog'

const PAGE_SIZE = 20

const emptyForm: CreateShopPayload = {
  shop_name: '',
  shop_id: 0,
  partner_id: 0,
  partner_key: '',
  access_token: '',
  refresh_token: '',
  token_expires_at: null,
}

export default function ShopeeSettingsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateShopPayload>({ ...emptyForm })

  const { data, isLoading } = useQuery({
    queryKey: ['shopee-shops', page],
    queryFn: () => listShops(page),
  })

  const createMutation = useMutation({
    mutationFn: createShop,
    onSuccess: () => {
      toast.success('Shop created')
      queryClient.invalidateQueries({ queryKey: ['shopee-shops'] })
      setDialogOpen(false)
      setForm({ ...emptyForm })
    },
    onError: () => toast.error('Failed to create shop'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => {
      toast.success('Shop deleted')
      queryClient.invalidateQueries({ queryKey: ['shopee-shops'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete shop'),
  })

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => toast.success('Sync triggered'),
    onError: () => toast.error('Failed to trigger sync'),
  })

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  const isTokenValid = (expiresAt: string | null) => {
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      token_expires_at: form.token_expires_at || null,
    })
  }

  const updateField = <K extends keyof CreateShopPayload>(key: K, value: CreateShopPayload[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Shopee Integration</h1>
        <Button onClick={() => { setForm({ ...emptyForm }); setDialogOpen(true) }}>Add Shop</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shop Name</TableHead>
              <TableHead>Shop ID</TableHead>
              <TableHead>Partner ID</TableHead>
              <TableHead>Token Expires</TableHead>
              <TableHead>Active</TableHead>
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
                  <TableCell>{shop.shop_id}</TableCell>
                  <TableCell>{shop.partner_id}</TableCell>
                  <TableCell>
                    <Badge variant={isTokenValid(shop.token_expires_at) ? 'success' : 'destructive'}>
                      {isTokenValid(shop.token_expires_at) ? 'Valid' : 'Expired'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={shop.is_active ? 'success' : 'secondary'}>
                      {shop.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncMutation.mutate(shop.id)}
                        disabled={syncMutation.isPending}
                      >
                        Sync Now
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

      {/* Add Shop Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shopee Shop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Shop Name" required>
              <Input value={form.shop_name} onChange={e => updateField('shop_name', e.target.value)} required />
            </FormField>
            <FormField label="Shop ID" required>
              <Input type="number" value={form.shop_id || ''} onChange={e => updateField('shop_id', Number(e.target.value))} required />
            </FormField>
            <FormField label="Partner ID" required>
              <Input type="number" value={form.partner_id || ''} onChange={e => updateField('partner_id', Number(e.target.value))} required />
            </FormField>
            <FormField label="Partner Key" required>
              <Input type="password" value={form.partner_key} onChange={e => updateField('partner_key', e.target.value)} required />
            </FormField>
            <FormField label="Access Token" required>
              <Input value={form.access_token} onChange={e => updateField('access_token', e.target.value)} required />
            </FormField>
            <FormField label="Refresh Token" required>
              <Input value={form.refresh_token} onChange={e => updateField('refresh_token', e.target.value)} required />
            </FormField>
            <FormField label="Token Expires At">
              <Input type="datetime-local" value={form.token_expires_at ?? ''} onChange={e => updateField('token_expires_at', e.target.value || null)} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
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
