import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { useCreateWarehouse, useUpdateWarehouse } from '../../hooks/api/useInventory'
import { toast } from '../../lib/toast'
import type { Warehouse } from '../../types/inventory'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  warehouse?: Warehouse
}

export function WarehouseFormModal({ open, onClose, warehouse }: Props) {
  const createMutation = useCreateWarehouse()
  const updateMutation = useUpdateWarehouse()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: warehouse
      ? { name: warehouse.name, address: warehouse.address, is_active: warehouse.is_active }
      : { name: '', address: '', is_active: true },
  })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      if (warehouse) {
        await updateMutation.mutateAsync({ id: warehouse.id, data: values })
        toast.success('Warehouse updated')
      } else {
        await createMutation.mutateAsync(values)
        toast.success('Warehouse created')
      }
      handleClose()
    } catch {
      toast.error('Failed to save warehouse')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Name" error={errors.name?.message} required>
            <Input {...register('name')} placeholder="Warehouse name" />
          </FormField>
          <FormField label="Address" error={errors.address?.message}>
            <Textarea {...register('address')} placeholder="Warehouse address" />
          </FormField>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4" />
            <label htmlFor="is_active" className="text-sm font-medium text-foreground">Active</label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : warehouse ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
