import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { FormField } from '../../components/ui/form'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { CategorySelect } from '../../components/ui/CategorySelect'
import { useCreateProduct } from '../../hooks/api/useInventory'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../lib/toast'

const schema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  categoryId: z.string().min(1, 'Category is required'),
  variantName: z.string().min(1, 'Variant name is required'),
  variantSkuSuffix: z.string().min(1, 'Variant SKU suffix is required'),
  weight: z.number().int().min(0).optional(),
  length: z.number().int().min(0).optional(),
  width: z.number().int().min(0).optional(),
  height: z.number().int().min(0).optional(),
})
type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (variantId: string, variantLabel: string) => void
}

export function QuickCreateVariantModal({ open, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const createMutation = useCreateProduct()

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {},
  })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (values: FormValues) => {
    const skuVariantCode = values.variantSkuSuffix.toUpperCase()
    const description = `${values.productName} (created via PO - update description in product settings)`

    const payload = {
      name: values.productName,
      description,
      company_id: user?.company_id,
      category_id: values.categoryId,
      weight: values.weight ?? 0,
      length: values.length ?? 0,
      width: values.width ?? 0,
      height: values.height ?? 0,
      variants: [{
        name: values.variantName,
        sku_variant_code: skuVariantCode,
        base_price: 0,
        marketplace_listings: [],
      }],
    }

    try {
      const created = await createMutation.mutateAsync(payload)
      const variant = created.variants[0]
      if (variant) {
        const label = `${values.variantName} (${skuVariantCode})`
        onCreated(variant.id, label)
        toast.success(`Product "${values.productName}" created`)
        handleClose()
      }
    } catch {
      toast.error('Failed to create product')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormField label="Product Name" error={errors.productName?.message} required>
            <Input {...register('productName')} placeholder="e.g. Kaos Polos" autoFocus />
          </FormField>
          <FormField label="Category" error={errors.categoryId?.message} required>
            <CategorySelect
              value={watch('categoryId') ?? ''}
              onChange={(id) => setValue('categoryId', id, { shouldValidate: true })}
              error={errors.categoryId?.message}
              required
            />
          </FormField>
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">First Variant</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Variant Name" error={errors.variantName?.message} required>
                <Input {...register('variantName')} placeholder="e.g. Blue / M" />
              </FormField>
              <FormField label="SKU Suffix" error={errors.variantSkuSuffix?.message} required>
                <Input {...register('variantSkuSuffix')} placeholder="e.g. BLU-M" />
              </FormField>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <FormField label="Weight (g)" error={errors.weight?.message}>
              <Input type="number" min="0" {...register('weight', { valueAsNumber: true })} placeholder="0" />
            </FormField>
            <FormField label="Length (cm)" error={errors.length?.message}>
              <Input type="number" min="0" {...register('length', { valueAsNumber: true })} placeholder="0" />
            </FormField>
            <FormField label="Width (cm)" error={errors.width?.message}>
              <Input type="number" min="0" {...register('width', { valueAsNumber: true })} placeholder="0" />
            </FormField>
            <FormField label="Height (cm)" error={errors.height?.message}>
              <Input type="number" min="0" {...register('height', { valueAsNumber: true })} placeholder="0" />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create & Select'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
