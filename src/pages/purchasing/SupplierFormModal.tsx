import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSupplier, useUpdateSupplier } from '../../hooks/api/inventory'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Button } from '../../components/ui/button'
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

interface Props {
  open: boolean
  onClose: () => void
  supplier?: Supplier
  onCreated?: (supplier: Supplier) => void
}

export function SupplierFormModal({ open, onClose, supplier, onCreated }: Props) {
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: supplier
      ? { name: supplier.name, contact_name: supplier.contact_name ?? '', phone: supplier.phone ?? '', country: supplier.country ?? '', notes: supplier.notes ?? '', supplier_link: supplier.supplier_link ?? '', is_active: supplier.is_active }
      : { name: '', contact_name: '', phone: '', country: 'China', notes: '', is_active: true, supplier_link: '' },
  })

  useEffect(() => {
    if (open) {
      reset(supplier
        ? {
            name: supplier.name,
            contact_name: supplier.contact_name ?? '',
            phone: supplier.phone ?? '',
            country: supplier.country ?? '',
            notes: supplier.notes ?? '',
            supplier_link: supplier.supplier_link ?? '',
            is_active: supplier.is_active,
          }
        : { name: '', contact_name: '', phone: '', country: 'China', notes: '', is_active: true, supplier_link: '' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id])

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      if (supplier) {
        await updateMutation.mutateAsync({ id: supplier.id, data: values })
        toast.success('Supplier updated')
        handleClose()
      } else {
        const newSupplier = await createMutation.mutateAsync(values)
        toast.success('Supplier created')
        onCreated?.(newSupplier)
        handleClose()
      }
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
