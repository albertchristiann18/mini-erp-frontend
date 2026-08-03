import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCompanyMarketplaces, useCreateCompanyMarketplace, useUpdateCompanyMarketplace, useDeleteCompanyMarketplace } from '../../hooks/api/inventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { FormField } from '../../components/ui/form'
import { Pagination } from '../../components/Pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Loading, ErrorState, Empty } from '../../components/ui/queryPrimitives'
import { toast } from '../../lib/toast'
import { applyApiErrors, useResetOnOpen } from '../../lib/formHelpers'
import type { CompanyMarketplace } from '../../types/inventory'
import type { ApiError } from '../../lib/errors'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export default function MarketplacesPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<CompanyMarketplace | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<CompanyMarketplace | undefined>()

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading, isError, error, refetch } = useCompanyMarketplaces(params)
  const createMutation = useCreateCompanyMarketplace()
  const updateMutation = useUpdateCompanyMarketplace()
  const deleteMutation = useDeleteCompanyMarketplace()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', is_active: true },
  })
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form
  const isMutating = createMutation.isPending || updateMutation.isPending

  useResetOnOpen(form, showModal, editing
    ? { name: editing.name, is_active: editing.is_active }
    : { name: '', is_active: true })

  const openCreate = () => {
    setEditing(undefined)
    setShowModal(true)
  }

  const openEdit = (m: CompanyMarketplace) => {
    setEditing(m)
    setShowModal(true)
  }

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: values })
        toast.success('Marketplace updated')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Marketplace created')
      }
      setShowModal(false)
    } catch (err) {
      applyApiErrors(form, err as ApiError)
      if (!(err as ApiError).fieldErrors) {
        toast.error('Failed to save marketplace')
      }
    }
  }

  const handleDelete = async (m: CompanyMarketplace) => {
    try {
      await deleteMutation.mutateAsync(m.id)
      toast.success('Marketplace deleted')
      setDeleteConfirm(undefined)
    } catch (err: unknown) {
      const status = (err as ApiError).status
      if (status === 409) {
        toast.error('Cannot delete — business entities are using this marketplace')
      } else {
        toast.error('Failed to delete marketplace')
      }
    }
  }

  function renderTableBody() {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={3}><Loading /></TableCell>
        </TableRow>
      )
    }
    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={3}>
            <ErrorState error={error as ApiError} onRetry={refetch} />
          </TableCell>
        </TableRow>
      )
    }
    if (!data?.results.length) {
      return (
        <TableRow>
          <TableCell colSpan={3}><Empty message="No marketplaces yet" /></TableCell>
        </TableRow>
      )
    }
    return data.results.map(m => (
      <TableRow key={m.id}>
        <TableCell className="font-medium">{m.name}</TableCell>
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
                size="icon"
                onClick={() => setDeleteConfirm(m)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
    ))
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
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-32" />}
            </TableRow>
          </TableHeader>
          <TableBody>{renderTableBody()}</TableBody>
        </Table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} isLoading={isLoading} />

      <Dialog open={showModal} onOpenChange={(o) => { if (!o) setShowModal(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Marketplace' : 'New Marketplace'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="Name" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="Marketplace name" />
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={watch('is_active')}
                onChange={e => setValue('is_active', e.target.checked)}
                className="rounded"
              />
              Active
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting || isMutating}>
                {isSubmitting || isMutating ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(undefined) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Marketplace</DialogTitle></DialogHeader>
          <p className="text-sm">Delete {deleteConfirm?.name}? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(undefined)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
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
