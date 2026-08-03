import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useMarketplaceConnections,
  useCreateMarketplaceConnection,
  useToggleMarketplaceConnection,
  useDeleteMarketplaceConnection,
} from '../../hooks/api/useMarketplace'
import type { MarketplacePlatform } from '../../types/marketplace'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { FormField } from '../../components/ui/form'
import { Loading, ErrorState, Empty } from '../../components/ui/queryPrimitives'
import { applyApiErrors, useResetOnOpen } from '../../lib/formHelpers'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog'
import { Pencil, Trash2 } from 'lucide-react'
import type { ApiError } from '../../lib/errors'

const schema = z.object({
  platform: z.enum(['SHOPEE', 'TIKTOK']),
  display_name: z.string().min(1, 'Display name is required'),
})
type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = { platform: 'SHOPEE', display_name: '' }

export default function MarketplaceSettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useMarketplaceConnections()
  const createMutation = useCreateMarketplaceConnection()
  const toggleMutation = useToggleMarketplaceConnection()
  const deleteMutation = useDeleteMarketplaceConnection()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form

  useResetOnOpen(form, dialogOpen, editId
    ? { platform: watch('platform'), display_name: watch('display_name') }
    : defaultValues)

  const openCreate = () => {
    setEditId(null)
    setDialogOpen(true)
  }

  const connections = data?.results ?? []

  const onSubmit = async (values: FormValues) => {
    // Edit path: currently no update endpoint used — same as original (edit UI was no-op)
    if (editId) return
    try {
      await createMutation.mutateAsync(values)
      toast.success('Marketplace connected')
      setDialogOpen(false)
    } catch (err) {
      applyApiErrors(form, err as ApiError)
      if (!(err as ApiError).fieldErrors) {
        toast.error('Failed to connect marketplace')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Marketplace Settings</h1>
        <Button onClick={openCreate}>Connect Marketplace</Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState error={error as ApiError} onRetry={refetch} />
      ) : connections.length === 0 ? (
        <Empty message='No marketplaces connected yet. Click "Connect Marketplace" to get started.' />
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
                      setValue('platform', connection.platform)
                      setValue('display_name', connection.display_name)
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
                  onClick={() => toggleMutation.mutate(connection.id, { onError: () => toast.error('Failed to toggle connection') })}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Connection' : 'Connect Marketplace'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {!editId && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Platform</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['SHOPEE', 'TIKTOK'] as MarketplacePlatform[]).map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => setValue('platform', platform)}
                      className={cn(
                        'flex flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors',
                        watch('platform') === platform
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
            <FormField label="Display Name" error={errors.display_name?.message} required>
              <Input
                {...register('display_name')}
                placeholder="e.g. Brand A Shopee Official"
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting || createMutation.isPending ? 'Connecting...' : editId ? 'Save' : 'Connect'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              onClick={() => deleteId && deleteMutation.mutate(deleteId, {
                onSuccess: () => { toast.success('Disconnected'); setDeleteId(null) },
                onError: () => toast.error('Failed to disconnect'),
              })}
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
