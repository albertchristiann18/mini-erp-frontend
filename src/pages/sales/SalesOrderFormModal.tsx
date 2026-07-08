import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { useWarehouses, useProductVariants } from '../../hooks/api/useInventory'
import { useCreateSalesOrder } from '../../hooks/api/useSales'
import { toast } from '../../lib/toast'

const itemSchema = z.object({
  product_variant: z.string().min(1, 'Variant required'),
  quantity: z.number().min(1, 'Min 1'),
  selling_price: z.number().min(0),
  marketplace_fee: z.number().min(0),
})

const schema = z.object({
  warehouse: z.string().min(1, 'Warehouse is required'),
  channel: z.string().min(1, 'Channel is required'),
  items: z.array(itemSchema).min(1, 'At least one item required'),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

const CHANNELS = ['SHOPEE', 'TOKOPEDIA', 'LAZADA', 'TIKTOK', 'DIRECT']

export function SalesOrderFormModal({ open, onClose }: Props) {
  const { data: warehousesData } = useWarehouses()
  const { data: variantsData } = useProductVariants()
  const createMutation = useCreateSalesOrder()

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'DIRECT', items: [{ product_variant: '', quantity: 1, selling_price: 0, marketplace_fee: 0 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const handleClose = () => { reset(); onClose() }

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync(values)
      toast.success('Sales order created')
      handleClose()
    } catch {
      toast.error('Failed to create sales order')
    }
  }

  const warehouses = warehousesData?.results ?? []
  const variants = variantsData?.results ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Sales Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Warehouse" error={errors.warehouse?.message} required>
              <Select
                value={watch('warehouse')}
                onValueChange={(v) => setValue('warehouse', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Channel" error={errors.channel?.message} required>
              <Select
                value={watch('channel')}
                onValueChange={(v) => setValue('channel', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Order Items</p>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ product_variant: '', quantity: 1, selling_price: 0, marketplace_fee: 0 })}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_60px_100px_80px_32px] gap-2 items-end">
                <FormField label={i === 0 ? 'Variant' : ''} error={errors.items?.[i]?.product_variant?.message}>
                  <Select
                    value={watch(`items.${i}.product_variant`)}
                    onValueChange={(v) => setValue(`items.${i}.product_variant`, v, { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                    <SelectContent>
                      {variants.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name} ({v.sku})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label={i === 0 ? 'Qty' : ''} error={errors.items?.[i]?.quantity?.message}>
                  <Input type="number" {...register(`items.${i}.quantity`, { valueAsNumber: true })} />
                </FormField>
                <FormField label={i === 0 ? 'Sell Price' : ''} error={errors.items?.[i]?.selling_price?.message}>
                  <Input type="number" {...register(`items.${i}.selling_price`, { valueAsNumber: true })} />
                </FormField>
                <FormField label={i === 0 ? 'Mkt Fee' : ''} error={errors.items?.[i]?.marketplace_fee?.message}>
                  <Input type="number" {...register(`items.${i}.marketplace_fee`, { valueAsNumber: true })} />
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
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
