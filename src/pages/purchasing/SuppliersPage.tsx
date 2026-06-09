import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Search, Plus, Pencil } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '../../hooks/useInventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { FormField } from '../../components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Pagination } from '../../components/Pagination'
import { toast } from '../../lib/toast'
import type { Supplier } from '../../types/inventory'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  supplier_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

export default function SuppliersPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Supplier | undefined>()

  const params: Record<string, string | number> = { page, page_size: 20 }
  if (search) params.search = search
  const { data, isLoading } = useSuppliers(params)
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const totalPages = data ? Math.ceil(data.count / 20) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-60 pl-8 h-8 text-sm"
              placeholder="Search suppliers..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setSearch(searchInput) }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch(searchInput)}>
            Search
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">{data?.count ?? 0} suppliers</span>
        {user?.is_staff && (
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Supplier
          </Button>
        )}
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Supplier Link</TableHead>
              <TableHead>Status</TableHead>
              {user?.is_staff && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : data?.results.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No suppliers found</TableCell></TableRow>
            ) : data?.results.map(s => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.contact_name || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.phone || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{s.country || '—'}</TableCell>
                <TableCell>
                  {s.supplier_link
                    ? <a href={s.supplier_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate max-w-[180px] block">{s.supplier_link}</a>
                    : <span className="text-muted-foreground text-sm">—</span>}
                </TableCell>
                <TableCell>
                  <Badge variant={s.is_active ? 'success' : 'secondary'}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {user?.is_staff && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setShowModal(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({ id: s.id, data: { is_active: !s.is_active } })
                            toast.success(s.is_active ? 'Supplier deactivated' : 'Supplier activated')
                          } catch {
                            toast.error('Failed to update supplier')
                          }
                        }}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
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
      <SupplierFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditing(undefined) }}
        supplier={editing}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />
    </div>
  )
}

interface ModalProps {
  open: boolean
  onClose: () => void
  supplier?: Supplier
  createMutation: ReturnType<typeof useCreateSupplier>
  updateMutation: ReturnType<typeof useUpdateSupplier>
}

function SupplierFormModal({ open, onClose, supplier, createMutation, updateMutation }: ModalProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contact_name: supplier.contact_name ?? '',
          phone: supplier.phone ?? '',
          country: supplier.country ?? '',
          notes: supplier.notes ?? '',
          supplier_link: supplier.supplier_link ?? '',
          is_active: supplier.is_active,
        }
      : { name: '', contact_name: '', phone: '', country: 'China', notes: '', is_active: true, supplier_link: '' },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      if (supplier) {
        await updateMutation.mutateAsync({ id: supplier.id, data: values })
        toast.success('Supplier updated')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Supplier created')
      }
      handleClose()
    } catch {
      toast.error('Failed to save supplier')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="Supplier name" />
          </FormField>
          <FormField label="Contact Name" error={errors.contact_name?.message}>
            <Input {...register('contact_name')} placeholder="Contact person" />
          </FormField>
          <FormField label="Phone" error={errors.phone?.message}>
            <Input {...register('phone')} placeholder="Phone number" />
          </FormField>
          <FormField label="Country" error={errors.country?.message}>
            <Input {...register('country')} placeholder="Country" />
          </FormField>
          <FormField label="Supplier Link" error={errors.supplier_link?.message}>
            <Input {...register('supplier_link')} placeholder="https://supplier-store.com/..." />
          </FormField>
          <FormField label="Notes" error={errors.notes?.message}>
            <Textarea {...register('notes')} placeholder="Notes" />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4" />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">Active</label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : supplier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
