import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { FormField } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useWarehouses } from '../../hooks/useInventory'
import { useCreatePurchaseOrder } from '../../hooks/usePurchasing'
import { VariantSearchSelect } from '../../features/purchasing/VariantSearchSelect'
import { toast } from '../../lib/toast'

const itemSchema = z.object({
  product_variant_id: z.string().min(1, 'Variant required'),
  ordered_qty: z.number().min(1, 'Min 1'),
  unit_price_foreign: z.number().min(0, 'Required'),
})

const schema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  order_details: z.array(itemSchema).min(1, 'At least one item required'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function PurchaseOrderFormModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { data: warehousesData } = useWarehouses()
  const createMutation = useCreatePurchaseOrder((id) => {
    toast.success('Purchase order created')
    onClose()
    navigate(`/purchasing/orders/${id}`)
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { order_details: [{ product_variant_id: '', ordered_qty: 1, unit_price_foreign: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'order_details' })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync(values)
    } catch {
      toast.error('Failed to create purchase order')
    }
  }

  const warehouses = warehousesData?.results ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Warehouse" error={errors.warehouse_id?.message} required>
              <Select
                value={watch('warehouse_id')}
                onValueChange={(v) => setValue('warehouse_id', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Order Items</p>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ product_variant_id: '', ordered_qty: 1, unit_price_foreign: 0 })}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {errors.order_details?.root && (
              <p className="text-xs text-red-500">{errors.order_details.root.message}</p>
            )}
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                <FormField label={i === 0 ? 'Variant' : ''} error={errors.order_details?.[i]?.product_variant_id?.message}>
                  <VariantSearchSelect
                    value={watch(`order_details.${i}.product_variant_id`)}
                    onSelect={(id) => setValue(`order_details.${i}.product_variant_id`, id, { shouldValidate: true })}
                    placeholder="Select variant"
                  />
                </FormField>
                <FormField label={i === 0 ? 'Qty' : ''} error={errors.order_details?.[i]?.ordered_qty?.message}>
                  <Input type="number" {...register(`order_details.${i}.ordered_qty`, { valueAsNumber: true })} />
                </FormField>
                <FormField label={i === 0 ? 'Unit Price' : ''} error={errors.order_details?.[i]?.unit_price_foreign?.message}>
                  <Input type="number" {...register(`order_details.${i}.unit_price_foreign`, { valueAsNumber: true })} />
                </FormField>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-500 hover:text-red-600 self-end">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create PO'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
