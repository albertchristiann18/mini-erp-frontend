import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMarketplaceConnections,
  createMarketplaceConnection,
  deleteMarketplaceConnection,
  toggleMarketplaceConnection,
} from '../../api/marketplace'
import type { MarketplaceConnectionFormData, MarketplacePlatform } from '../../types/marketplace'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { FormField } from '../../components/ui/form'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog'
import { Pencil, Trash2 } from 'lucide-react'

const emptyForm: MarketplaceConnectionFormData = {
  platform: 'SHOPEE',
  display_name: '',
}

export default function MarketplaceSettingsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<MarketplaceConnectionFormData>({ ...emptyForm })

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-connections'],
    queryFn: () => getMarketplaceConnections(),
  })

  const createMutation = useMutation({
    mutationFn: createMarketplaceConnection,
    onSuccess: () => {
      toast.success('Marketplace connected')
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] })
      setDialogOpen(false)
      setForm({ ...emptyForm })
    },
    onError: () => toast.error('Failed to connect marketplace'),
  })

  const toggleMutation = useMutation({
    mutationFn: toggleMarketplaceConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] })
    },
    onError: () => toast.error('Failed to toggle connection'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMarketplaceConnection,
    onSuccess: () => {
      toast.success('Disconnected')
      queryClient.invalidateQueries({ queryKey: ['marketplace-connections'] })
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to disconnect'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editId) {
      // For future edit support
      return
    }
    createMutation.mutate(form)
  }

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const connections = data?.results ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Marketplace Settings</h1>
        <Button onClick={openCreate}>Connect Marketplace</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading...
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            No marketplaces connected yet. Click &quot;Connect Marketplace&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map(connection => (
            <div
              key={connection.id}
              className="rounded-lg border bg-card p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white',
                    connection.platform === 'SHOPEE' ? 'bg-orange-500' : 'bg-gray-900'
                  )}
                >
                  {connection.platform}
                </span>
                <div className="flex gap-1">
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => {
                      setEditId(connection.id)
                      setForm({ platform: connection.platform, display_name: connection.display_name })
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => setDeleteId(connection.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className="text-lg font-semibold text-foreground">{connection.display_name}</p>
                <p className="text-sm text-muted-foreground">{connection.platform === 'SHOPEE' ? 'Shopee' : 'TikTok'}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  role="switch"
                  aria-checked={connection.is_active}
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(connection.id)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50',
                    connection.is_active ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      connection.is_active ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
                <span
                  className={cn(
                    'text-sm font-medium',
                    connection.is_active ? 'text-green-600' : 'text-muted-foreground'
                  )}
                >
                  {connection.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Connection' : 'Connect Marketplace'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {!editId && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['SHOPEE', 'TIKTOK'] as MarketplacePlatform[]).map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, platform }))}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors',
                        form.platform === platform
                          ? platform === 'SHOPEE'
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                            : 'border-gray-900 bg-gray-50 dark:border-gray-400 dark:bg-gray-500/10'
                          : 'border-border hover:border-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-bold',
                          platform === 'SHOPEE' ? 'text-orange-600' : 'text-gray-900 dark:text-gray-200'
                        )}
                      >
                        {platform === 'SHOPEE' ? 'Shopee' : 'TikTok'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <FormField label="Display Name" required>
              <Input
                value={form.display_name}
                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. Brand A Shopee Official"
                required
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Connecting...' : editId ? 'Save' : 'Connect'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Marketplace</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to disconnect this marketplace? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
