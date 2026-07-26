import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useShopeeShops,
  useCreateShopeeShop,
  useDeleteShopeeShop,
  useTriggerShopeeSync,
} from '../../../hooks/api/useMarketplace'
import { toast } from '../../../lib/toast'
import { applyApiErrors, useResetOnOpen } from '../../../lib/formHelpers'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Input } from '../../../components/ui/input'
import { FormField } from '../../../components/ui/form'
import { Pagination } from '../../../components/Pagination'
import { Loading, ErrorState, Empty } from '../../../components/ui/queryPrimitives'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '../../../components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../../components/ui/dialog'
import type { ApiError } from '../../../lib/errors'

const PAGE_SIZE = 20

const schema = z.object({
  shop_name: z.string().min(1, 'Shop name is required'),
  shop_id: z.number().min(1, 'Shop ID is required'),
  partner_id: z.number().min(1, 'Partner ID is required'),
  partner_key: z.string().min(1, 'Partner key is required'),
  access_token: z.string().min(1, 'Access token is required'),
  refresh_token: z.string().min(1, 'Refresh token is required'),
  token_expires_at: z.string().nullable().optional(),
})
type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  shop_name: '',
  shop_id: 0,
  partner_id: 0,
  partner_key: '',
  access_token: '',
  refresh_token: '',
  token_expires_at: null,
}

export default function ShopeeSettingsPage() {
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useShopeeShops(page)
  const createMutation = useCreateShopeeShop()
  const deleteMutation = useDeleteShopeeShop()
  const syncMutation = useTriggerShopeeSync()

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = form

  useResetOnOpen(form, dialogOpen, defaultValues)

  const isTokenValid = (expiresAt: string | null) => {
    if (!expiresAt) return true
    return new Date(expiresAt) > new Date()
  }

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        ...values,
        token_expires_at: values.token_expires_at || null,
      })
      toast.success('Shop created')
      setDialogOpen(false)
    } catch (err) {
      applyApiErrors(form, err as ApiError)
      if (!(err as ApiError).fieldErrors) {
        toast.error('Failed to create shop')
      }
    }
  }

  function renderTableBody() {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6}><Loading /></TableCell>
        </TableRow>
      )
    }
    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <ErrorState error={error as ApiError} onRetry={refetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (!data?.results.length) {
      return (
        <TableRow>
          <TableCell colSpan={6}><Empty message="No shops connected" /></TableCell>
        </TableRow>
      )
    }
    return data.results.map(shop => (
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
              onClick={() => syncMutation.mutate(shop.id, { onSuccess: () => toast.success('Sync triggered'), onError: () => toast.error('Failed to trigger sync') })}
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
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Shopee Integration</h1>
        <Button onClick={() => setDialogOpen(true)}>Add Shop</Button>
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
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
        <div className="px-4 pb-3">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shopee Shop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Shop Name" error={errors.shop_name?.message} required>
              <Input {...register('shop_name')} />
            </FormField>
            <FormField label="Shop ID" error={errors.shop_id?.message} required>
              <Input type="number" {...register('shop_id', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Partner ID" error={errors.partner_id?.message} required>
              <Input type="number" {...register('partner_id', { valueAsNumber: true })} />
            </FormField>
            <FormField label="Partner Key" error={errors.partner_key?.message} required>
              <Input type="password" {...register('partner_key')} />
            </FormField>
            <FormField label="Access Token" error={errors.access_token?.message} required>
              <Input {...register('access_token')} />
            </FormField>
            <FormField label="Refresh Token" error={errors.refresh_token?.message} required>
              <Input {...register('refresh_token')} />
            </FormField>
            <FormField label="Token Expires At" error={errors.token_expires_at?.message}>
              <Input type="datetime-local" {...register('token_expires_at')} />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create'}
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
              onClick={() => deleteId && deleteMutation.mutate(deleteId, {
                onSuccess: () => { toast.success('Shop deleted'); setDeleteId(null) },
                onError: () => toast.error('Failed to delete shop'),
              })}
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
